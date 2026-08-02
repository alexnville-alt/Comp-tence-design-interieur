import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const config: NextConfig = {
  // `standalone` n'a de sens que pour l'image Docker : il n'embarque que les
  // fichiers nécessaires au lieu de tout node_modules. Mais il rend
  // `next start` inopérant (le serveur produit est `.next/standalone/...`),
  // ce qui casse silencieusement les Server Actions en test de bout en bout.
  // On l'active donc uniquement quand on construit l'image (voir docker/Dockerfile).
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  reactStrictMode: true,
  // Ces paquets de l'espace de travail sont livrés en TypeScript brut.
  transpilePackages: ["@atelier/domain", "@atelier/ui", "@atelier/db"],
  // Vérifie à la compilation que chaque `href` pointe vers une route
  // existante : un lien mort devient une erreur de build, pas un 404 découvert
  // en production.
  typedRoutes: true,
  // Pas de `async` : aucune attente ici, la signature attend simplement une
  // promesse.
  headers() {
    return Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ]);
  },
};

// `withSentryConfig` reste sans effet observable sans les variables
// SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN (absentes de ce dépôt) : le
// plugin de compilation avertit puis saute l'étape d'upload des source maps
// plutôt que d'échouer le build — vérifié par un `next build` réel sans ces
// variables (M12).
export default withSentryConfig(config, {
  silent: true,
  telemetry: false,
  webpack: { treeshake: { removeDebugLogging: true } },
});
