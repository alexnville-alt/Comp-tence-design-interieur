import NextAuth from "next-auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@atelier/db";

import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "LEARNER" | "ADMIN";
  onboarded: boolean;
}

/**
 * Récupère l'utilisateur courant, ou `null`.
 *
 * À utiliser dans les Server Components qui affichent différemment selon
 * l'état de connexion sans l'exiger.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      deletedAt: true,
      profile: { select: { onboardedAt: true } },
    },
  });

  if (!user || user.deletedAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    onboarded: user.profile?.onboardedAt != null,
  };
}

/**
 * Exige une session valide, sinon redirige vers la connexion.
 *
 * ⚠️ À appeler **dans chaque Server Action et chaque page protégée**, jamais
 * uniquement dans le composant parent : une Server Action est un point
 * d'entrée HTTP à part entière, atteignable directement, et la vérification
 * faite par la page qui l'affiche ne la protège en rien (docs/02 §6).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

/**
 * Exige une session **et** un onboarding terminé.
 * Utilisé par les pages de la zone applicative.
 */
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.onboarded) redirect("/bienvenue");
  return user;
}

/**
 * Exige le rôle `ADMIN`. `notFound()` plutôt qu'une redirection : un
 * apprenant qui tombe sur l'URL d'une page d'administration ne doit même pas
 * apprendre qu'elle existe.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}

/**
 * Invalide immédiatement toutes les sessions d'un utilisateur, sur tous ses
 * appareils (ADR-0012). Appelé au changement de mot de passe et à la
 * suppression de compte.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
