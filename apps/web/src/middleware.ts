import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * En-têtes de sécurité par requête (docs/02 §6, M12).
 *
 * `next.config.ts` pose les en-têtes statiques (X-Content-Type-Options,
 * Referrer-Policy, X-Frame-Options, Permissions-Policy) : ils ne dépendent
 * d'aucune donnée de requête. La CSP, elle, a besoin d'un nonce différent à
 * chaque requête — impossible à exprimer dans `next.config.ts`, d'où ce
 * middleware.
 *
 * Le nonce est posé à la fois sur les en-têtes de la *requête* transmise au
 * moteur de rendu et sur ceux de la *réponse* : c'est la requête forwardée
 * que Next.js inspecte pour appliquer automatiquement le nonce à ses propres
 * scripts injectés (hydratation, RSC) — le poser seulement sur la réponse ne
 * suffit pas.
 *
 * `style-src-attr 'unsafe-inline'` reste nécessaire : les éditeurs (atelier
 * 2D, moodboard) positionnent des éléments via des attributs `style` en
 * ligne pour un rendu à coordonnées calculées, et CSP niveau 3 n'offre aucun
 * mécanisme par nonce ou hash pour les attributs `style` — seul
 * `'unsafe-inline'`, ici volontairement limité à `style-src-attr` et non à
 * `style-src` dans son ensemble, le permet.
 */

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const s3 = originOf(process.env.S3_ENDPOINT);
  // Sans DSN, Sentry ne tente jamais d'appel réseau (M12) — cette entrée
  // n'a donc d'effet que si la supervision est effectivement configurée.
  const sentry = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  // Le rafraîchissement à chaud de `next dev` (Fast Refresh, WebSocket HMR)
  // a besoin de `'unsafe-eval'` et d'une connexion `ws:` — absentes du build
  // de production réellement servi. Sans ce relâchement, `pnpm dev` casserait
  // silencieusement dès ce middleware actif.
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    // `blob:` : aperçus de photos côté client avant téléversement (M6).
    `img-src 'self' blob: data:${s3 ? ` ${s3}` : ""}`,
    "font-src 'self'",
    // Dépôt direct navigateur → bucket par URL présignée (ADR-0008, M6) ;
    // origine d'ingestion Sentry si la supervision client est configurée.
    `connect-src 'self'${s3 ? ` ${s3}` : ""}${sentry ? ` ${sentry}` : ""}${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // HSTS n'a de sens que servi en HTTPS — un navigateur ignore cet en-tête
  // reçu en clair, donc l'envoyer aussi en développement local est sans
  // risque et évite un branchement conditionnel sur l'environnement.
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  return response;
}

export const config = {
  matcher: [
    // Exclut les fichiers statiques et images d'optimisation Next.js : ils
    // n'ont pas besoin de CSP et le middleware ajouterait une latence inutile
    // sur chaque asset.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
