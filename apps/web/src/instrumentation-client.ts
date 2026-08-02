/**
 * Chargé automatiquement par Next.js avant tout code client (convention
 * `instrumentation-client.ts`, Next.js ≥ 15.3) — capture les erreurs React
 * côté navigateur (éditeur atelier, moodboard, chat).
 *
 * `NEXT_PUBLIC_SENTRY_DSN`, pas `SENTRY_DSN` : ce fichier est embarqué dans
 * le bundle client, donc seule une variable explicitement préfixée
 * `NEXT_PUBLIC_` (visible de quiconque ouvre les outils de développement)
 * peut y être lue — jamais une variable serveur (voir lib/env.ts).
 *
 * Import dynamique, pas statique : un `import * as Sentry` en tête de
 * fichier embarque le SDK dans le bundle partagé de *chaque* page, qu'un DSN
 * soit configuré ou non — mesuré (M12) à +84 ko de JS partagé, suffisant
 * pour faire échouer les budgets de performance (docs/01 §4) sur le tableau
 * de bord et le lecteur de leçon. L'import dynamique n'est jamais résolu
 * quand `NEXT_PUBLIC_SENTRY_DSN` est absent : Next.js le sépare dans un
 * chunk distinct, jamais chargé, jamais compté dans le budget.
 */
import type { captureRouterTransitionStart } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  });
}

// Requis par le SDK pour instrumenter les transitions de route App Router —
// un no-op tant que Sentry n'est pas configuré ci-dessus.
export function onRouterTransitionStart(
  ...args: Parameters<typeof captureRouterTransitionStart>
) {
  if (!dsn) return;
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureRouterTransitionStart(...args);
  });
}
