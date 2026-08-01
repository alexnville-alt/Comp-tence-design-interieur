"use server";

import { redirect } from "next/navigation";
import { prisma } from "@atelier/db";
import { onboardingSchema, scoreDiagnostic } from "@atelier/domain";

import { requireUser } from "@/lib/auth";

export interface OnboardingState {
  error?: string;
}

/**
 * Enregistre l'onboarding et calcule le niveau de départ.
 *
 * Le score est recalculé **côté serveur** à partir des réponses brutes : si le
 * client envoyait directement un `startingLevel`, il suffirait de modifier une
 * requête pour se placer au niveau 4 sans répondre. On ne fait donc jamais
 * confiance à un résultat calculé par le navigateur.
 */
export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const rawAnswers = formData.get("diagnosticAnswers");
  let diagnosticAnswers: Record<string, string> = {};
  if (typeof rawAnswers === "string" && rawAnswers.length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawAnswers);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        diagnosticAnswers = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        );
      }
    } catch {
      return { error: "Réponses du diagnostic illisibles. Réessayez." };
    }
  }

  const parsed = onboardingSchema.safeParse({
    goal: formData.get("goal"),
    housingType: formData.get("housingType"),
    weeklyMinutes: Number(formData.get("weeklyMinutes")),
    diagnosticAnswers,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Certaines réponses sont invalides. Reprenez les étapes.",
    };
  }

  const { goal, housingType, weeklyMinutes } = parsed.data;
  const diagnostic = scoreDiagnostic(parsed.data.diagnosticAnswers);

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      goal,
      housingType,
      weeklyMinutes,
      startingLevel: diagnostic.startingLevel,
      onboardedAt: new Date(),
    },
    update: {
      goal,
      housingType,
      weeklyMinutes,
      startingLevel: diagnostic.startingLevel,
      onboardedAt: new Date(),
    },
  });

  redirect("/tableau-de-bord?bienvenue=1");
}
