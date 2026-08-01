import type { AiUsageTokens, EmbedInput, EmbedResult } from "../port";

/**
 * Client Voyage AI (ADR-0013) — embeddings de la bibliothèque, jamais du
 * texte de chat ou d'exercice. Fichier séparé de `anthropic.ts` : c'est un
 * fournisseur distinct (Anthropic n'a pas d'API d'embeddings), branché sur
 * `anthropicProvider.embed()` plutôt que dupliqué en un second `AiProvider`
 * complet qui n'aurait de sens que pour une seule de ses quatre méthodes.
 *
 * N'est jamais exercé en CI, même principe qu'`anthropic.ts` (ADR-0011) :
 * exclu des seuils de couverture (`vitest.config.ts`).
 */

const MODEL = "voyage-3.5";
const OUTPUT_DIMENSION = 1024; // aligné sur LibraryItem.embedding (packages/db/prisma/schema.prisma)
const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

// Ordre de grandeur (voyageai.com/pricing) — à revérifier avant mise en
// production. Jamais exercé automatiquement (ADR-0011), donc aucun test ne
// garde ce chiffre à jour : c'est une estimation de coût, pas une facture.
const USD_PER_MTOK = 0.06;
const USD_TO_EUR = 0.92;

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
}

export async function embedWithVoyage(input: EmbedInput): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY manquant — requis pour AiProvider.embed() en production.",
    );
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: input.texts,
      model: MODEL,
      input_type: input.inputType,
      output_dimension: OUTPUT_DIMENSION,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage AI a répondu ${response.status} : ${await response.text()}`);
  }

  const body = (await response.json()) as VoyageResponse;
  const embeddings = [...body.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);

  const usage: AiUsageTokens = {
    inputTokens: body.usage.total_tokens,
    outputTokens: 0,
    cachedTokens: 0,
  };
  const costEuros =
    Math.round((usage.inputTokens / 1_000_000) * USD_PER_MTOK * USD_TO_EUR * 1_000_000) /
    1_000_000;

  return { embeddings, usage, costEuros, model: body.model };
}
