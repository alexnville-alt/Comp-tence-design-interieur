"use server";

import { prisma } from "@atelier/db";
import { AnalysePhotoSchema } from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { aiProvider } from "@/lib/ai/provider";
import { checkAiQuota, recordAiUsage } from "@/lib/ai/usage";
import { getObjectBytes } from "@/lib/storage/s3";

/**
 * Analyse photo (M6, docs/02 §5.3, docs/05 M6).
 *
 * Cache par SHA-256 avant toute autre vérification (ADR-0008, critère
 * d'acceptation : « réanalyser la même image ne déclenche aucun appel IA ») —
 * même ordre de priorité que le garde-fou en tête du chat (M5) : la
 * vérification la moins coûteuse, capable d'éviter tout appel, passe en
 * premier.
 */

const PROMPT_VERSION = "photo-analysis-v1";

const ANALYSIS_SYSTEM_PROMPT = `Tu es un architecte d'intérieur qui analyse la photo d'une pièce pour Atelier, une plateforme d'apprentissage.

Si la photo ne montre pas l'intérieur d'une pièce à aménager (paysage, extérieur, photo non pertinente), signale-le poliment sans inventer d'analyse : réponds avec pertinente à false et une raison courte.

Sinon, réponds avec pertinente à true et analyse le style, les proportions, la circulation et la lumière ; identifie les problèmes avec un pourquoi précis et un repère positionné sur l'image (coordonnées en pourcentage) ; propose au moins trois améliorations classées par effort et budget, chacune justifiée par un pourquoiCaMarche concret ; termine par une courte critique de synthèse.

Sur tout budget, utilise l'expression « ordre de grandeur » plutôt qu'un chiffre présenté comme définitif.`;

export interface AnalyzePhotoResult {
  ok: boolean;
  error?: "not_found" | "quota" | "provider_unavailable";
  message?: string;
  analysisId?: string;
}

export async function analyzePhotoAction(
  assetId: string,
  roomId?: string,
): Promise<AnalyzePhotoResult> {
  const user = await requireOnboardedUser();

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.userId !== user.id) {
    return { ok: false, error: "not_found" };
  }

  // Cache par SHA-256 : cherche une analyse existante pour n'importe quel
  // asset qui a produit exactement les mêmes octets traités — pas seulement
  // celui-ci — puisque deux téléversements de la même photo créent deux
  // `Asset` distincts (pas de déduplication à l'upload).
  const cached = await prisma.photoAnalysis.findFirst({
    where: { asset: { sha256: asset.sha256 } },
    orderBy: { createdAt: "desc" },
  });

  if (cached) {
    const copy = await prisma.photoAnalysis.create({
      data: {
        assetId: asset.id,
        roomId: roomId ?? null,
        result: cached.result as object,
        model: cached.model,
        promptVersion: cached.promptVersion,
        costCents: 0,
      },
    });
    return { ok: true, analysisId: copy.id };
  }

  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) {
    return {
      ok: false,
      error: "quota",
      message:
        "Le quota d'assistant IA de ce mois est atteint — réessayez le mois prochain.",
    };
  }

  const imageBytes = await getObjectBytes(asset.storageKey);

  const startedAt = Date.now();
  try {
    const result = await aiProvider.analyzeImage({
      system: ANALYSIS_SYSTEM_PROMPT,
      images: [{ base64: imageBytes.toString("base64"), mediaType: "image/jpeg" }],
      schema: AnalysePhotoSchema,
      effort: "high",
    });

    await recordAiUsage({
      userId: user.id,
      feature: "PHOTO_ANALYSIS",
      model: result.model,
      usage: result.usage,
      costEuros: result.costEuros,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    const analysis = await prisma.photoAnalysis.create({
      data: {
        assetId: asset.id,
        roomId: roomId ?? null,
        result: result.data,
        model: result.model,
        promptVersion: PROMPT_VERSION,
        costCents: Math.round(result.costEuros * 100),
      },
    });

    return { ok: true, analysisId: analysis.id };
  } catch (error) {
    await recordAiUsage({
      userId: user.id,
      feature: "PHOTO_ANALYSIS",
      model: "inconnu",
      usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
      costEuros: 0,
      durationMs: Date.now() - startedAt,
      success: false,
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    // Fournisseur indisponible : l'application reste utilisable, l'apprenant
    // peut réessayer.
    return {
      ok: false,
      error: "provider_unavailable",
      message:
        "L'analyse est momentanément indisponible. Réessayez dans quelques instants.",
    };
  }
}
