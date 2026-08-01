"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@atelier/db";
import { profileSettingsSchema } from "@atelier/domain";

import { requireUser, revokeAllSessions, signOut } from "@/lib/auth";
import { MOTION_COOKIE, THEME_COOKIE } from "@/lib/theme";

export interface ProfileState {
  error?: string;
  success?: string;
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Enregistre les préférences.
 *
 * Le thème est écrit **à la fois** en base et dans un cookie : la base est la
 * source de vérité (retrouvée sur un nouvel appareil), le cookie permet au
 * serveur d'appliquer le thème dès le premier octet de HTML, sans
 * clignotement ni script bloquant (voir lib/theme).
 */
export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = profileSettingsSchema.safeParse({
    name: formData.get("name") || undefined,
    theme: formData.get("theme"),
    weeklyMinutes: Number(formData.get("weeklyMinutes")),
    reducedMotion: formData.get("reducedMotion") === "on",
    soundEnabled: formData.get("soundEnabled") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Préférences invalides.",
    };
  }

  const { name, theme, weeklyMinutes, reducedMotion, soundEnabled } = parsed.data;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: name ? { name } : {},
    }),
    prisma.profile.update({
      where: { userId: user.id },
      data: { theme, weeklyMinutes, reducedMotion, soundEnabled },
    }),
  ]);

  const store = await cookies();
  store.set(THEME_COOKIE, theme, { maxAge: COOKIE_MAX_AGE, sameSite: "lax", path: "/" });
  store.set(MOTION_COOKIE, String(reducedMotion), {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  revalidatePath("/", "layout");
  return { success: "Préférences enregistrées." };
}

/**
 * Suppression de compte (AUTH-04, RGPD).
 *
 * Suppression **logique** puis purge différée, et non `DELETE` immédiat :
 *
 * - une suppression accidentelle reste rattrapable pendant la fenêtre de
 *   rétention (30 jours) ;
 * - un `DELETE` en cascade sur un compte chargé (projets, versions, fichiers)
 *   est une transaction longue, mal placée dans une requête web ;
 * - les fichiers du stockage objet doivent être supprimés séparément (M6),
 *   ce qui suppose un traitement asynchrone de toute façon.
 *
 * L'effet visible est immédiat : le compte devient inaccessible et toutes les
 * sessions sont révoquées à la seconde.
 */
export async function deleteAccountAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  // Confirmation explicite : l'utilisateur retape son adresse e-mail. Un
  // simple bouton « Supprimer » est trop facile à cliquer par erreur pour une
  // action irréversible.
  // `formData.get()` renvoie `string | File | null` : convertir sans vérifier
  // le type produirait « [object File] » pour un envoi malformé, qui pourrait
  // coïncider avec une valeur attendue. On exige explicitement une chaîne.
  const rawConfirmation = formData.get("confirmation");
  const confirmation =
    typeof rawConfirmation === "string" ? rawConfirmation.trim().toLowerCase() : "";
  if (confirmation !== user.email.toLowerCase()) {
    return {
      error: "Saisissez exactement votre adresse e-mail pour confirmer.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date() },
  });

  await revokeAllSessions(user.id);
  await signOut({ redirectTo: "/?compte-supprime=1" });

  return {};
}
