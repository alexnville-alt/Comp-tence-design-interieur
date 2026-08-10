import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import {
  AiSchemaValidationError,
  type AiProvider,
  type AiResult,
  type AiUsageTokens,
  type ChatInput,
  type ChatMessage,
  type EmbedInput,
  type EmbedResult,
  type StructuredInput,
  type VisionImage,
  type VisionInput,
} from "../port";
import { embedWithVoyage } from "./voyage";
import { zodToJsonSchema } from "./zod-json-schema";

/**
 * Adaptateur de production (ADR-0005, docs/02 §5.2), sorties structurées,
 * cache de prompt système. N'est jamais exercé en CI — la suite « en direct »
 * (`AI_LIVE=1`) se lance manuellement (ADR-0011) ; il est exclu des seuils de
 * couverture (`vitest.config.ts`).
 *
 * Modèle : `claude-haiku-4-5`, à la place du `claude-opus-5` par défaut de
 * l'ADR-0005 — choix personnel du porteur du projet pour un usage local à
 * coût réduit (~5x moins cher que `claude-opus-5` en entrée comme en
 * sortie). L'ADR anticipait ce cas (« router une tâche simple vers un modèle
 * moins cher sans toucher au métier ») mais Haiku ne prend en charge ni la
 * pensée adaptative (`thinking`) ni `output_config.effort` (erreur 400) —
 * les deux sont donc omis ci-dessous, pour toutes les fonctions IA de
 * l'application (chat, correction d'exercices, analyse de photo, moodboard,
 * critique de projet) puisque cet adaptateur n'a qu'un seul modèle. La
 * qualité d'analyse d'image, motif principal du choix initial de
 * `claude-opus-5` dans l'ADR, en pâtit potentiellement.
 */

const MODEL = "claude-haiku-4-5";
// Le streaming systématique évite le délai d'expiration HTTP au-delà
// d'environ 16 000 tokens de sortie non streamés (docs/02 §5.2) ; comme on
// veut de toute façon un affichage progressif, `max_tokens` peut être généreux.
const MAX_TOKENS = 64_000;
const USD_PER_MTOK_INPUT = 1;
const USD_PER_MTOK_OUTPUT = 5;
// Taux fixe, à titre d'ordre de grandeur : un taux de change en direct serait
// un appel réseau de plus sur le chemin critique du coût, pour une précision
// que la comptabilité interne (AiUsage) n'exige pas.
const USD_TO_EUR = 0.92;
const MAX_ATTEMPTS = 2; // un essai, puis une reprise (docs/02 §5.4 niveau 3)

const client = new Anthropic(); // lit ANTHROPIC_API_KEY côté serveur

function usageOf(usage: Anthropic.Usage): AiUsageTokens {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedTokens: usage.cache_read_input_tokens ?? 0,
  };
}

function costOf(usage: AiUsageTokens): number {
  const costUsd =
    (usage.inputTokens / 1_000_000) * USD_PER_MTOK_INPUT +
    (usage.outputTokens / 1_000_000) * USD_PER_MTOK_OUTPUT;
  return Math.round(costUsd * USD_TO_EUR * 1_000_000) / 1_000_000;
}

function systemBlock(system: string): Anthropic.TextBlockParam[] {
  // Préfixe stable mis en cache (ADR-0005) : `system` ne doit jamais contenir
  // de donnée variable — c'est la responsabilité de l'appelant, pas de cet
  // adaptateur, mais c'est pour ça que le contexte variable (retour d'échec
  // de schéma compris) est toujours ajouté dans `messages`, jamais ici.
  return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
}

function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function withImages(
  messages: Anthropic.MessageParam[],
  images: VisionImage[],
): Anthropic.MessageParam[] {
  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((image) => ({
    type: "image",
    source: { type: "base64", media_type: image.mediaType, data: image.base64 },
  }));
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
  if (lastUserIndex === -1) {
    return [...messages, { role: "user", content: imageBlocks }];
  }
  // sûr : lastUserIndex vient de lastIndexOf sur ce même tableau, donc dans ses bornes.
  const target = messages[lastUserIndex]!;
  const textContent: Anthropic.ContentBlockParam[] =
    typeof target.content === "string"
      ? [{ type: "text", text: target.content }]
      : target.content;
  const merged: Anthropic.MessageParam = {
    role: "user",
    content: [...imageBlocks, ...textContent],
  };
  return [
    ...messages.slice(0, lastUserIndex),
    merged,
    ...messages.slice(lastUserIndex + 1),
  ];
}

async function streamText(params: Anthropic.MessageStreamParams) {
  const stream = client.messages.stream(params);
  let text = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  return { text, usage: final.usage };
}

function retryTurn(issues: z.ZodIssue[]): Anthropic.MessageParam[] {
  const summary = issues
    .slice(0, 5)
    .map((issue) => `- ${issue.path.join(".") || "(racine)"} : ${issue.message}`)
    .join("\n");
  return [
    { role: "assistant", content: "(réponse précédente rejetée : hors schéma attendu)" },
    {
      role: "user",
      content:
        "Ta réponse précédente ne respecte pas le format attendu. Corrige-la en respectant " +
        `strictement le schéma JSON demandé. Problèmes relevés :\n${summary}`,
    },
  ];
}

async function runStructured<T>(
  system: string,
  initialMessages: Anthropic.MessageParam[],
  schema: z.ZodType<T>,
): Promise<AiResult<T>> {
  const format = { type: "json_schema" as const, schema: zodToJsonSchema(schema) };
  let messages = initialMessages;
  let lastError: AiSchemaValidationError | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { text, usage } = await streamText({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Ni `thinking` ni `output_config.effort` : non pris en charge par
      // claude-haiku-4-5 (erreur 400) — voir le commentaire en tête de fichier.
      output_config: { format },
      system: systemBlock(system),
      messages,
    });
    const tokens = usageOf(usage);

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      lastError = new AiSchemaValidationError("Réponse du fournisseur IA non JSON.", []);
      messages = [...messages, ...retryTurn([])];
      continue;
    }
    const result = schema.safeParse(raw);
    if (result.success) {
      return {
        data: result.data,
        usage: tokens,
        costEuros: costOf(tokens),
        model: MODEL,
      };
    }
    lastError = new AiSchemaValidationError(
      "Réponse hors schéma attendu.",
      result.error.issues,
    );
    messages = [...messages, ...retryTurn(result.error.issues)];
  }

  // Inatteignable en pratique : la boucle ci-dessus affecte toujours lastError
  // avant de la reboucler ou en sortir sur succès — ce filet de sécurité type
  // simplement ce qui est structurellement garanti.
  throw (
    lastError ??
    new AiSchemaValidationError("Échec de la sortie structurée, sans détail.", [])
  );
}

export const anthropicProvider: AiProvider = {
  async *streamChat({ system, messages }: ChatInput) {
    // Ni `thinking` ni `output_config.effort` : non pris en charge par
    // claude-haiku-4-5 (erreur 400) — voir le commentaire en tête de fichier.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemBlock(system),
      messages: toAnthropicMessages(messages),
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "delta" as const, text: event.delta.text };
      }
    }
    const final = await stream.finalMessage();
    const usage = usageOf(final.usage);
    yield { type: "done" as const, usage, costEuros: costOf(usage), model: MODEL };
  },

  async complete<T>(input: StructuredInput<T>): Promise<AiResult<T>> {
    return runStructured(input.system, toAnthropicMessages(input.messages), input.schema);
  },

  async analyzeImage<T>(input: VisionInput<T>): Promise<AiResult<T>> {
    const messages = withImages(toAnthropicMessages(input.messages ?? []), input.images);
    return runStructured(input.system, messages, input.schema);
  },

  embed(input: EmbedInput): Promise<EmbedResult> {
    return embedWithVoyage(input);
  },
};
