import type {
  AiProvider,
  AiResult,
  AiUsageTokens,
  ChatInput,
  ChatMessage,
  StructuredInput,
  VisionInput,
} from "../port";
import { generateFakeValue } from "./fake-schema";

/**
 * Adaptateur factice (ADR-0005, ADR-0011) : aucun réseau, aucune clé API,
 * déterministe. Utilisé par défaut en développement et en CI (`AI_PROVIDER=fake`).
 *
 * `complete()` et `analyzeImage()` valident leur sortie avec **exactement le
 * même schéma Zod** que l'adaptateur Anthropic recevrait — c'est ce qui rend
 * les tests de contrat significatifs : un schéma que le fournisseur réel ne
 * pourrait pas satisfaire échouerait ici aussi.
 */

const MODEL = "fake-deterministic-v1";
const USD_TO_EUR = 0.92;

function usageFor(inputChars: number, outputChars: number): AiUsageTokens {
  // Approximation grossière (≈ 4 caractères/token) : suffisante pour des
  // montants de coût déterministes en test, pas une vraie tokenisation.
  return {
    inputTokens: Math.ceil(inputChars / 4),
    outputTokens: Math.ceil(outputChars / 4),
    cachedTokens: 0,
  };
}

function costFor(usage: AiUsageTokens): number {
  // Mêmes tarifs que `claude-opus-5` (5 $/MTok entrée, 25 $/MTok sortie,
  // docs/02 §5.2), convertis en euros à un taux fixe pour rester déterministe.
  const costUsd =
    (usage.inputTokens / 1_000_000) * 5 + (usage.outputTokens / 1_000_000) * 25;
  return Math.round(costUsd * USD_TO_EUR * 1_000_000) / 1_000_000;
}

function inputCharsOf(system: string, messages: ChatMessage[]): number {
  return system.length + messages.reduce((total, m) => total + m.content.length, 0);
}

function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role === "user") return message.content;
  }
  return "";
}

function fakeStructuredResult<T>(
  schema: StructuredInput<T>["schema"],
  inputChars: number,
): AiResult<T> {
  const raw = generateFakeValue(schema);
  const data = schema.parse(raw);
  const usage = usageFor(inputChars, JSON.stringify(data).length);
  return { data, usage, costEuros: costFor(usage), model: MODEL };
}

export const fakeAiProvider: AiProvider = {
  async *streamChat({ system, messages }: ChatInput) {
    const question = lastUserMessage(messages);
    const reply =
      `Réponse factice (adaptateur de développement, aucun appel réseau). ` +
      `Vous avez écrit : « ${question} ». ` +
      `Le prompt système comptait ${system.length} caractères.`;
    for (const word of reply.split(" ")) {
      // Micro-délai réel entre les fragments : garde le générateur authentiquement
      // asynchrone (un vrai flux SSE ne livre jamais tout de façon synchrone) et
      // exerce les mêmes chemins `await` côté consommateur qu'un flux réel.
      await Promise.resolve();
      yield { type: "delta" as const, text: `${word} ` };
    }
    const usage = usageFor(inputCharsOf(system, messages), reply.length);
    yield { type: "done" as const, usage, costEuros: costFor(usage), model: MODEL };
  },

  complete<T>(input: StructuredInput<T>): Promise<AiResult<T>> {
    return Promise.resolve(
      fakeStructuredResult(input.schema, inputCharsOf(input.system, input.messages)),
    );
  },

  analyzeImage<T>(input: VisionInput<T>): Promise<AiResult<T>> {
    // Ordre de grandeur du coût d'une image redimensionnée à 1568 px
    // (docs/02 §5.6), pour que le coût factice reste réaliste.
    const inputChars =
      inputCharsOf(input.system, input.messages ?? []) + input.images.length * 1_500 * 4;
    return Promise.resolve(fakeStructuredResult(input.schema, inputChars));
  },
};
