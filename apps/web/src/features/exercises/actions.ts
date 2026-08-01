"use server";

import { prisma } from "@atelier/db";
import { ExerciseFrontmatterSchema, gradeExercise } from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * Correction des exercices (docs/05 M3).
 *
 * `gradeExercise` est une fonction pure de `@atelier/domain` : ce fichier ne
 * fait que lui fournir un `payload` de confiance (relu depuis la base, jamais
 * depuis le client) et persister le résultat. Le score envoyé par le client
 * n'existe même pas dans le type d'entrée — il ne peut donc pas être falsifié
 * en modifiant la requête.
 */

export interface SubmitExerciseResult {
  ok: boolean;
  score?: number;
  maxScore?: number;
  correct?: boolean;
  explanation?: string;
  attempt?: number;
}

export async function submitExerciseAction(
  exerciseId: string,
  answer: unknown,
): Promise<SubmitExerciseResult> {
  const user = await requireOnboardedUser();

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return { ok: false };

  const parsedExercise = ExerciseFrontmatterSchema.safeParse(exercise.payload);
  if (!parsedExercise.success) return { ok: false };

  let grading: ReturnType<typeof gradeExercise>;
  try {
    grading = gradeExercise(parsedExercise.data, answer);
  } catch {
    // Réponse malformée (forme inattendue) — jamais une exception qui
    // remonterait jusqu'au client comme une erreur serveur opaque.
    return { ok: false };
  }

  const score = Math.round(exercise.maxScore * grading.scoreRatio);

  const previousAttempts = await prisma.submission.count({
    where: { userId: user.id, exerciseId },
  });

  await prisma.submission.create({
    data: {
      userId: user.id,
      exerciseId,
      answer: answer as object,
      score,
      scoreRatio: grading.scoreRatio,
      correct: grading.correct,
      attempt: previousAttempts + 1,
    },
  });

  return {
    ok: true,
    score,
    maxScore: exercise.maxScore,
    correct: grading.correct,
    explanation: parsedExercise.data.explanation,
    attempt: previousAttempts + 1,
  };
}
