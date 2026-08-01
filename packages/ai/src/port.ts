import type { z } from "zod";

/**
 * Port `AiProvider` (ADR-0005, docs/02 §5.1). Trois méthodes, aucune de plus :
 * chat en flux, réponse structurée, analyse d'image. Le port ne connaît ni
 * Anthropic ni aucun autre fournisseur — seuls les adaptateurs
 * (`adapters/anthropic.ts`, `adapters/fake.ts`) en dépendent.
 */

/** low pour un indice de quiz, high pour une critique de projet — le levier coût/qualité (docs/02 §5.2). */
export type AiEffort = "low" | "medium" | "high" | "xhigh" | "max";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatInput {
  /**
   * Préfixe stable, mis en cache côté fournisseur (`cache_control: ephemeral`).
   * Ne doit **jamais** contenir de donnée variable (date, identité, contexte
   * de leçon) — voir ADR-0005 : un préfixe qui change à chaque appel désactive
   * le cache pour de bon. Le contexte variable va dans `messages`.
   */
  system: string;
  messages: ChatMessage[];
  effort?: AiEffort;
}

/**
 * `delta` porte un fragment de texte à afficher au fil de l'eau ; le flux se
 * termine toujours par exactement un `done`, qui porte l'usage et le coût
 * final — l'appelant (route de chat SSE, M5 tâche #33) en a besoin pour
 * persister `AiUsage` une fois la réponse complète, sans dépendre d'un effet
 * de bord caché dans l'adaptateur.
 */
export type ChatChunk =
  | { type: "delta"; text: string }
  | { type: "done"; usage: AiUsageTokens; costEuros: number; model: string };

export interface StructuredInput<T> {
  system: string;
  messages: ChatMessage[];
  /** Schéma Zod validant la réponse — jamais de parsing de texte libre (docs/02 §5.3). */
  schema: z.ZodType<T>;
  effort?: AiEffort;
}

export interface VisionImage {
  /** Image encodée en base64, déjà redimensionnée (≤ 1568 px, docs/02 §5.6). */
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface VisionInput<T> {
  system: string;
  images: VisionImage[];
  messages?: ChatMessage[];
  schema: z.ZodType<T>;
  effort?: AiEffort;
}

export interface AiUsageTokens {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface AiResult<T> {
  data: T;
  usage: AiUsageTokens;
  costEuros: number;
  model: string;
}

export interface AiProvider {
  /** Chat en streaming — retourne un flux de fragments de texte. */
  streamChat(input: ChatInput): AsyncIterable<ChatChunk>;

  /** Réponse structurée validée par un schéma Zod. */
  complete<T>(input: StructuredInput<T>): Promise<AiResult<T>>;

  /** Analyse d'image (le port ne connaît que des images, pas un fournisseur). */
  analyzeImage<T>(input: VisionInput<T>): Promise<AiResult<T>>;
}

/** Erreur levée quand la réponse du fournisseur ne valide pas le schéma attendu, même après une reprise (docs/02 §5.4, niveau 3). */
export class AiSchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = "AiSchemaValidationError";
  }
}
