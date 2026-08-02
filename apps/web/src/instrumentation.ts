import type { captureRequestError } from "@sentry/nextjs";

/**
 * Point d'entrée exécuté une fois au démarrage du serveur (avant la première
 * requête). C'est ici qu'a lieu la validation stricte de l'environnement :
 * au lancement, et non à la compilation, pour qu'un `next build` n'ait jamais
 * besoin des secrets de production (voir lib/env.ts).
 *
 * Supervision (M12) : Sentry (erreurs) et OpenTelemetry (traces) sont
 * initialisés ici uniquement si leur variable d'environnement dédiée est
 * présente — absente, aucun appel réseau n'est jamais tenté (même principe
 * que `ANTHROPIC_API_KEY`). Ni compte Sentry, ni collecteur OTLP réel ne
 * sont fournis avec ce dépôt ; voir docs/07-exploitation.md pour les
 * brancher en production.
 */
export async function register() {
  // Uniquement dans l'exécution Node : le runtime Edge n'a ni accès à la base
  // ni aux mêmes variables.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertEnv } = await import("@/lib/env");
  const env = assertEnv();

  if (env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }

  if (env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "atelier-web" });
  }
}

/**
 * Hook Next.js appelé pour toute erreur non gérée côté serveur (Server
 * Components, Server Actions, routes). Un no-op silencieux si Sentry n'a
 * jamais été initialisé (pas de `SENTRY_DSN`) — comportement documenté du
 * SDK, pas une supposition.
 */
export async function onRequestError(...args: Parameters<typeof captureRequestError>) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
