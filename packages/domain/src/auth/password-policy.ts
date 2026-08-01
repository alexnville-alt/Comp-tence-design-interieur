/**
 * Politique de mot de passe.
 *
 * Fonction pure, sans dépendance : la même règle est appliquée côté client
 * (retour immédiat pendant la saisie) et côté serveur (validation qui fait
 * autorité). Dupliquer cette logique dans deux endroits garantirait qu'elles
 * divergent — c'est précisément ce que `packages/domain` évite (ADR-0009).
 *
 * Choix : on suit la recommandation NIST SP 800-63B — la longueur prime sur
 * la complexité imposée. Exiger « une majuscule, un chiffre et un caractère
 * spécial » produit surtout des mots de passe du type `Password1!`, qui sont
 * courts et prévisibles. On impose donc 10 caractères minimum et on refuse
 * les mots de passe manifestement faibles, sans imposer de composition.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

/** Mots de passe les plus courants — refusés quelle que soit leur longueur. */
const COMMON_PASSWORDS = new Set([
  "motdepasse",
  "motdepasse1",
  "password",
  "password1",
  "password123",
  "azertyuiop",
  "qwertyuiop",
  "1234567890",
  "12345678910",
  "administrateur",
  "bonjour123",
  "soleil123",
  "jetaime123",
  "changeme123",
  "atelier123",
]);

export type PasswordIssue =
  "too_short" | "too_long" | "too_common" | "repeated_characters" | "contains_email";

export interface PasswordCheck {
  valid: boolean;
  issues: PasswordIssue[];
  /** Indice de robustesse 0–4, destiné à l'affichage d'une jauge. */
  strength: 0 | 1 | 2 | 3 | 4;
}

/**
 * @param password Le mot de passe saisi.
 * @param email    L'e-mail du compte, si connu — un mot de passe qui contient
 *                 la partie locale de l'e-mail est trivialement devinable.
 */
export function checkPassword(password: string, email?: string): PasswordCheck {
  const issues: PasswordIssue[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) issues.push("too_short");
  if (password.length > PASSWORD_MAX_LENGTH) issues.push("too_long");

  const normalized = password.toLowerCase().trim();
  if (COMMON_PASSWORDS.has(normalized)) issues.push("too_common");

  // « aaaaaaaaaa » atteint la longueur requise sans apporter d'entropie.
  if (/^(.)\1*$/.test(password) && password.length > 0) {
    issues.push("repeated_characters");
  }

  const localPart = email?.split("@")[0]?.toLowerCase();
  if (localPart && localPart.length >= 3 && normalized.includes(localPart)) {
    issues.push("contains_email");
  }

  return { valid: issues.length === 0, issues, strength: estimateStrength(password) };
}

/**
 * Estimation grossière de la robustesse, uniquement destinée au retour visuel.
 * Ce n'est pas une mesure d'entropie : elle ne sert jamais à autoriser ou
 * refuser un mot de passe, seulement à colorer une jauge.
 */
function estimateStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password.length === 0) return 0;

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 14) score++;
  if (password.length >= 20) score++;
  // La longueur seule doit pouvoir atteindre le score maximal : une phrase de
  // passe de 25 caractères en minuscules est plus solide qu'un « P@ssw0rd! »
  // de 9. Sans ce palier, la jauge contredirait la politique qu'elle
  // accompagne, en poussant l'utilisateur vers la complexité plutôt que vers
  // la longueur.
  if (password.length >= 25) score++;

  const varieties = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (varieties >= 3) score++;

  // Un mot de passe trivial ne doit jamais afficher une jauge rassurante.
  if (COMMON_PASSWORDS.has(password.toLowerCase().trim()) || /^(.)\1*$/.test(password)) {
    return 0;
  }

  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

/** Libellés destinés à l'interface, en français. */
export const PASSWORD_ISSUE_MESSAGES: Record<PasswordIssue, string> = {
  too_short: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  too_long: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  too_common: "Ce mot de passe est trop courant. Choisissez-en un autre.",
  repeated_characters: "Un mot de passe ne peut pas être une seule lettre répétée.",
  contains_email: "Le mot de passe ne doit pas contenir votre adresse e-mail.",
};
