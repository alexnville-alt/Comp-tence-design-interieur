/**
 * Limitation de débit en mémoire.
 *
 * ⚠️ Portée volontairement limitée à M1. Le compteur vit dans le processus :
 * avec plusieurs instances, chacune applique sa propre limite. C'est
 * suffisant pour freiner une attaque par force brute depuis une seule source,
 * insuffisant pour une attaque distribuée.
 *
 * Le passage à un compteur partagé (Redis / Upstash) est prévu en M12, au
 * moment de la mise en production. L'interface ci-dessous ne changera pas :
 * seule l'implémentation sera remplacée.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Purge périodique : sans elle, la Map croît indéfiniment. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  lastCleanup = now;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Tentatives restantes dans la fenêtre courante. */
  remaining: number;
  /** Secondes avant réinitialisation — à afficher à l'utilisateur. */
  retryAfterSeconds: number;
}

/**
 * @param key      Identifiant du seau. Combiner action et source, par exemple
 *                 `login:alex@exemple.fr` ou `reset:203.0.113.7`.
 * @param limit    Nombre de tentatives autorisées dans la fenêtre.
 * @param windowMs Durée de la fenêtre.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds };
}

/** Remise à zéro d'un seau — après une connexion réussie, par exemple. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Vide tous les seaux. Réservé aux tests. */
export function __resetAllRateLimits(): void {
  buckets.clear();
  lastCleanup = Date.now();
}

/**
 * Réglages par action.
 *
 * La connexion est limitée par e-mail **et** par IP, avec deux seuils très
 * différents, et c'est délibéré :
 *
 * - **Par e-mail (8 / 15 min)** : c'est le contrôle précis. Il vise l'attaque
 *   par force brute sur un compte identifié, et 8 essais suffisent largement à
 *   un utilisateur qui hésite entre deux mots de passe.
 *
 * - **Par IP (40 / 15 min)** : c'est un frein grossier, contre l'essai d'un
 *   mot de passe courant sur de nombreux comptes. Il doit rester permissif car
 *   une adresse IP n'identifie pas une personne : derrière un NAT d'entreprise,
 *   un réseau universitaire ou un CGNAT d'opérateur mobile, des centaines
 *   d'utilisateurs légitimes partagent la même adresse. Un seuil serré y
 *   produirait des blocages massifs d'innocents — un déni de service infligé à
 *   nos propres utilisateurs, sans gêner sérieusement un attaquant qui, lui,
 *   change d'adresse à volonté.
 *
 * Le même raisonnement vaut pour l'inscription : on veut arrêter la création
 * automatisée de milliers de comptes, pas la famille qui s'inscrit à trois
 * depuis la même connexion — ni la suite E2E, qui partage la même IP et le
 * même processus serveur sur toute son exécution (`fullyParallel: false`,
 * `workers: 1`) et crée un compte par fichier de test. 60/heure reste bien
 * en dessous de tout rythme d'automatisation malveillante réaliste tout en
 * laissant de la marge à mesure que la suite grandit (M7 : 31 comptes sur
 * une exécution complète, contre 30 pour M6).
 */
export const RATE_LIMITS = {
  loginPerEmail: { limit: 8, windowMs: 15 * 60 * 1000 },
  loginPerIp: { limit: 40, windowMs: 15 * 60 * 1000 },
  signup: { limit: 60, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;
