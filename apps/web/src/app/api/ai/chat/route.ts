import { prisma } from "@atelier/db";
import { detectRiskyTopic } from "@atelier/domain";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { aiProvider } from "@/lib/ai/provider";
import { checkAiQuota, recordAiUsage } from "@/lib/ai/usage";
import {
  CHAT_SYSTEM_PROMPT,
  buildLessonContextMessage,
  toChatHistory,
} from "@/features/ai/chat";

/**
 * Chat pédagogique en streaming (docs/05 M5, AI-01).
 *
 * SSE via `fetch` + `ReadableStream` plutôt que `EventSource` : l'endpoint a
 * besoin d'un corps de requête (message, contexte de leçon) et `EventSource`
 * ne fait que du GET.
 *
 * Ordre des vérifications, dans le sens du critère d'acceptation M5 : garde-fou
 * (AI-09, aucun appel IA si un sujet à risque est détecté) avant le quota,
 * quota avant l'appel au fournisseur — jamais l'inverse.
 */
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  conversationId: z.string().cuid().optional(),
  lessonId: z.string().cuid().optional(),
  message: z.string().trim().min(1).max(4000),
});

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.onboarded) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Requête invalide.", { status: 400 });
  }
  const { conversationId: existingConversationId, lessonId, message } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(sseEvent(data));

      try {
        // Jamais confiance dans un conversationId venu du client sans
        // vérifier qu'il appartient bien à l'utilisateur courant.
        const conversation = existingConversationId
          ? await prisma.aiConversation.findFirst({
              where: { id: existingConversationId, userId: user.id },
            })
          : await prisma.aiConversation.create({
              data: { userId: user.id, ...(lessonId ? { context: { lessonId } } : {}) },
            });

        if (!conversation) {
          send({
            type: "error",
            reason: "not_found",
            message: "Conversation introuvable.",
          });
          return;
        }

        send({ type: "conversation", conversationId: conversation.id });

        // Niveau 1 des garde-fous (AI-09) : détecté → réponse type, zéro
        // appel au fournisseur IA.
        const riskyTopic = detectRiskyTopic(message);
        if (riskyTopic) {
          await prisma.$transaction([
            prisma.aiMessage.create({
              data: { conversationId: conversation.id, role: "USER", content: message },
            }),
            prisma.aiMessage.create({
              data: {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: riskyTopic.message,
              },
            }),
          ]);
          send({ type: "delta", text: riskyTopic.message });
          send({ type: "done", guardrail: riskyTopic.topic });
          return;
        }

        const quota = await checkAiQuota(user.id);
        if (!quota.allowed) {
          const quotaMessage =
            "Le quota d'assistant IA de ce mois est atteint — il se réinitialise le mois prochain. Le reste de l'application reste utilisable normalement.";
          await prisma.$transaction([
            prisma.aiMessage.create({
              data: { conversationId: conversation.id, role: "USER", content: message },
            }),
            prisma.aiMessage.create({
              data: {
                conversationId: conversation.id,
                role: "SYSTEM",
                content: quotaMessage,
              },
            }),
          ]);
          send({ type: "delta", text: quotaMessage });
          send({ type: "done", quotaExceeded: true });
          return;
        }

        const [history, lesson] = await Promise.all([
          prisma.aiMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
          }),
          lessonId
            ? prisma.lesson.findUnique({
                where: { id: lessonId },
                select: { title: true, summary: true },
              })
            : Promise.resolve(null),
        ]);

        await prisma.aiMessage.create({
          data: { conversationId: conversation.id, role: "USER", content: message },
        });

        const messages = [
          ...(lesson ? [buildLessonContextMessage(lesson)] : []),
          ...toChatHistory(history),
          { role: "user" as const, content: message },
        ];

        const startedAt = Date.now();
        let fullText = "";
        let providerFailed = false;

        try {
          for await (const chunk of aiProvider.streamChat({
            system: CHAT_SYSTEM_PROMPT,
            messages,
            effort: "medium",
          })) {
            if (chunk.type === "delta") {
              fullText += chunk.text;
              send({ type: "delta", text: chunk.text });
            } else {
              await recordAiUsage({
                userId: user.id,
                feature: "CHAT",
                model: chunk.model,
                usage: chunk.usage,
                costEuros: chunk.costEuros,
                durationMs: Date.now() - startedAt,
                success: true,
              });
            }
          }
        } catch (error) {
          providerFailed = true;
          await recordAiUsage({
            userId: user.id,
            feature: "CHAT",
            model: "inconnu",
            usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
            costEuros: 0,
            durationMs: Date.now() - startedAt,
            success: false,
            errorCode: error instanceof Error ? error.name : "unknown",
          });
        }

        if (!providerFailed && fullText) {
          await prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: fullText,
            },
          });
          send({ type: "done" });
        } else {
          // Fournisseur indisponible : l'application reste utilisable
          // (critère d'acceptation M5) — message clair, jamais une erreur
          // serveur opaque, et rien de mensonger n'est persisté en base.
          send({
            type: "error",
            reason: "provider_unavailable",
            message:
              "L'assistant est momentanément indisponible. Réessayez dans quelques instants.",
          });
        }
      } catch {
        send({
          type: "error",
          reason: "server",
          message: "Une erreur est survenue. Réessayez dans quelques instants.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
