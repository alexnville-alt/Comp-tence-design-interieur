"use server";

import { prisma } from "@atelier/db";
import { computeAssessmentScore, hasPassedAssessment } from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * Finalisation d'une évaluation de fin de niveau (docs/05 M3).
 *
 * Chaque exercice est déjà noté individuellement par `submitExerciseAction`
 * (correction immédiate) ; cette action ne fait que **agréger** les
 * dernières soumissions de l'utilisateur pour calculer le score global et
 * décider du déverrouillage — jamais recalculer une note d'exercice.
 *
 * Échouer ne verrouille rien : `LevelProgress.completedAt` n'est écrit que
 * si l'évaluation est réussie, une tentative ratée reste une tentative,
 * jamais une régression (docs/05 M3, critère d'acceptation).
 */

export interface FinalizeAssessmentResult {
  ok: boolean;
  error?: string;
  score?: number;
  passingScore?: number;
  passed?: boolean;
}

export async function finalizeAssessmentAction(
  assessmentId: string,
): Promise<FinalizeAssessmentResult> {
  const user = await requireOnboardedUser();

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { exercises: true },
  });
  if (!assessment) return { ok: false, error: "Évaluation introuvable." };

  const results: { maxScore: number; scoreRatio: number }[] = [];
  for (const exercise of assessment.exercises) {
    const lastSubmission = await prisma.submission.findFirst({
      where: { userId: user.id, exerciseId: exercise.id },
      orderBy: { createdAt: "desc" },
    });
    if (!lastSubmission) {
      return { ok: false, error: "Répondez à toutes les questions avant de valider." };
    }
    results.push({ maxScore: exercise.maxScore, scoreRatio: lastSubmission.scoreRatio });
  }

  const score = computeAssessmentScore(results);
  const passed = hasPassedAssessment(score, assessment.passingScore);

  const existing = await prisma.levelProgress.findUnique({
    where: { userId_levelId: { userId: user.id, levelId: assessment.levelId } },
  });

  await prisma.levelProgress.upsert({
    where: { userId_levelId: { userId: user.id, levelId: assessment.levelId } },
    update: {
      bestScore: Math.max(existing?.bestScore ?? 0, score),
      ...(passed ? { completedAt: existing?.completedAt ?? new Date() } : {}),
    },
    create: {
      userId: user.id,
      levelId: assessment.levelId,
      bestScore: score,
      unlockedAt: new Date(),
      ...(passed ? { completedAt: new Date() } : {}),
    },
  });

  return { ok: true, score, passingScore: assessment.passingScore, passed };
}
