/**
 * @atelier/ai — port `AiProvider` + adaptateurs (ADR-0005).
 *
 * `packages/domain` ne peut pas dépendre de ce paquet (ADR-0009) ; c'est
 * l'inverse qui est vrai : cet adaptateur peut réutiliser des schémas et
 * fonctions pures de `@atelier/domain` (garde-fous, correction par barème).
 */

export * from "./port";
export { fakeAiProvider } from "./adapters/fake";
export { anthropicProvider } from "./adapters/anthropic";
export { generateFakeValue } from "./adapters/fake-schema";
export { zodToJsonSchema } from "./adapters/zod-json-schema";

import type { AiProvider } from "./port";
import { anthropicProvider } from "./adapters/anthropic";
import { fakeAiProvider } from "./adapters/fake";

/**
 * Sélectionne l'adaptateur selon `AI_PROVIDER` (`apps/web/src/lib/env.ts`).
 * `fake` par défaut — c'est ce qui garde le développement et la CI hors ligne.
 */
export function createAiProvider(providerName: "fake" | "anthropic"): AiProvider {
  return providerName === "anthropic" ? anthropicProvider : fakeAiProvider;
}
