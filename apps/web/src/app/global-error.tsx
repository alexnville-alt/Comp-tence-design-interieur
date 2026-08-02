"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Filet de secours ultime (M12) : ne s'affiche que si le layout racine
 * lui-même a levé une exception — tout le reste de l'app garde ses propres
 * limites d'erreur locales. Remplace entièrement `<html>`/`<body>` le temps
 * de l'incident, donc ne peut réutiliser ni le layout ni ses styles.
 *
 * `Sentry.captureException` est un no-op silencieux si `NEXT_PUBLIC_SENTRY_DSN`
 * n'a jamais été configuré (voir `instrumentation-client.ts`) — appelé sans
 * condition ici, comme le veut la convention documentée du SDK.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1>Une erreur inattendue est survenue</h1>
        <p>L'équipe a été prévenue. Vous pouvez réessayer, ou revenir plus tard.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "0.5rem",
            border: "1px solid currentColor",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
