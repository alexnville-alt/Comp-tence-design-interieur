/**
 * Point d'entrée exécuté une fois au démarrage du serveur (avant la première
 * requête). C'est ici qu'a lieu la validation stricte de l'environnement :
 * au lancement, et non à la compilation, pour qu'un `next build` n'ait jamais
 * besoin des secrets de production (voir lib/env.ts).
 */
export async function register() {
  // Uniquement dans l'exécution Node : le runtime Edge n'a ni accès à la base
  // ni aux mêmes variables.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertEnv } = await import("@/lib/env");
  assertEnv();
}
