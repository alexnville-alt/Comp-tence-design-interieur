import { createAiProvider, type AiProvider } from "@atelier/ai";
import { env } from "@/lib/env";

/**
 * L'adaptateur IA de l'application (ADR-0005), sélectionné une fois au
 * démarrage via `AI_PROVIDER` — `fake` par défaut (développement, CI),
 * `anthropic` en production. Jamais instancié plus d'une fois par
 * fonctionnalité : tout le code serveur importe cette même instance.
 */
export const aiProvider: AiProvider = createAiProvider(env.AI_PROVIDER);
