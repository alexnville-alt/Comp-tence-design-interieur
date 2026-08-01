import { hash, verify } from "@node-rs/argon2";

/**
 * Hachage de mot de passe — Argon2id.
 *
 * Argon2id plutôt que bcrypt (ADR-0004) : meilleure résistance aux attaques
 * matérielles (GPU/ASIC), et pas de troncature silencieuse à 72 octets — un
 * piège de bcrypt où deux mots de passe longs différents peuvent donner le
 * même haché.
 *
 * Paramètres : recommandation OWASP 2024 (19 Mio de mémoire, 2 itérations,
 * parallélisme 1). Ils sont volontairement centralisés ici : les modifier
 * n'invalide pas les hachés existants, car Argon2 encode ses paramètres dans
 * la chaîne produite.
 */
const OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2, // Argon2id
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/**
 * Vérifie un mot de passe.
 *
 * Ne lève jamais : un haché corrompu ou d'un autre format renvoie `false`
 * plutôt que de propager une exception qui, remontée jusqu'à la page de
 * connexion, distinguerait « compte inexistant » de « format invalide » —
 * et donnerait ainsi un signal exploitable pour énumérer les comptes.
 */
export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password, OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Haché factice utilisé lorsqu'aucun compte ne correspond à l'e-mail saisi.
 *
 * Sans cela, une tentative sur un e-mail inexistant répondrait instantanément,
 * alors qu'une tentative sur un compte existant prendrait ~50 ms le temps de
 * vérifier le mot de passe. Cet écart mesurable permet d'énumérer les comptes.
 * On effectue donc toujours une vérification, même vouée à l'échec.
 */
export const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0kZq7oQGHNMhVK7d1n6qkGZKJ3tHhTZoJXWQlFPl5vY";
