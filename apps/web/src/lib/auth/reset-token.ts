import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@atelier/db";

/**
 * Jetons de réinitialisation de mot de passe.
 *
 * Deux décisions de sécurité :
 *
 * 1. **Le jeton n'est jamais stocké en clair.** La base ne contient que son
 *    SHA-256. Une fuite de la base ne permet donc pas de prendre la main sur
 *    un compte — c'est exactement le même raisonnement que pour les mots de
 *    passe. (SHA-256 suffit ici, contrairement aux mots de passe : le jeton
 *    fait 256 bits d'entropie réelle, il n'est pas attaquable par dictionnaire.)
 *
 * 2. **Usage unique et durée courte.** Un jeton consommé ou expiré est refusé,
 *    et l'utilisation d'un jeton invalide ne révèle jamais si le compte existe.
 */

const TOKEN_BYTES = 32;
const TTL_MS = 60 * 60 * 1000; // 1 heure

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crée un jeton pour un utilisateur.
 * @returns Le jeton **en clair**, à placer dans le lien envoyé par e-mail.
 *          Il n'est jamais récupérable ensuite.
 */
export async function createResetToken(userId: string): Promise<string> {
  // Un seul jeton actif à la fois : demander un nouveau lien doit invalider
  // le précédent, sinon un lien intercepté reste utilisable.
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });

  return token;
}

export interface ResetTokenCheck {
  valid: boolean;
  userId?: string;
  reason?: "unknown" | "expired" | "already_used";
}

/**
 * Vérifie un jeton sans le consommer — pour afficher le formulaire uniquement
 * si le lien est encore valide.
 */
export async function checkResetToken(token: string): Promise<ResetTokenCheck> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true, expiresAt: true, usedAt: true, tokenHash: true },
  });

  if (!record) return { valid: false, reason: "unknown" };
  if (record.usedAt) return { valid: false, reason: "already_used" };
  if (record.expiresAt.getTime() <= Date.now())
    return { valid: false, reason: "expired" };

  // Comparaison à temps constant, par cohérence : la recherche par index a
  // déjà eu lieu, mais on ne veut aucune comparaison de secret non protégée
  // dans le code — c'est le genre de détail qui se propage par copier-coller.
  const expected = Buffer.from(record.tokenHash, "utf8");
  const actual = Buffer.from(hashToken(token), "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { valid: false, reason: "unknown" };
  }

  return { valid: true, userId: record.userId };
}

/**
 * Consomme un jeton de façon atomique.
 *
 * Le `updateMany` avec `usedAt: null` dans le filtre garantit qu'une seule
 * requête peut réussir, même si deux arrivent simultanément — un simple
 * « lire puis écrire » laisserait passer les deux.
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  const check = await checkResetToken(token);
  if (!check.valid || !check.userId) return null;

  const result = await prisma.passwordResetToken.updateMany({
    where: { tokenHash: hashToken(token), usedAt: null },
    data: { usedAt: new Date() },
  });

  return result.count === 1 ? check.userId : null;
}
