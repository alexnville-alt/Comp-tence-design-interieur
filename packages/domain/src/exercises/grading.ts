import { z } from "zod";
import type { ExerciseFrontmatter, ExerciseType } from "./schema";

/**
 * Schémas de réponse et correction pure des exercices (docs/05 M3).
 *
 * `gradeExercise` ne fait confiance à rien venant du client au-delà de la
 * forme de la réponse : c'est cette fonction, appelée côté serveur avec le
 * `payload` lu en base, qui calcule le score — jamais un score envoyé par le
 * client (voir `apps/web/src/features/exercises/actions.ts`).
 */

export const AnswerSchemas = {
  QUIZ_MCQ: z.object({ selectedIndices: z.array(z.number().int().nonnegative()) }),
  QUIZ_TRUE_FALSE: z.object({ value: z.boolean() }),
  QUIZ_MATCH: z.object({ assignments: z.array(z.number().int().nonnegative()) }),
  QUIZ_ORDER: z.object({ order: z.array(z.number().int().nonnegative()) }),
  HOTSPOT: z.object({ selectedIndices: z.array(z.number().int().nonnegative()) }),
  PALETTE: z.object({ selectedIndices: z.array(z.number().int().nonnegative()) }),
  MATERIAL_CHOICE: z.object({ selectedIndex: z.number().int().nonnegative() }),
} as const satisfies Record<ExerciseType, z.ZodTypeAny>;

export type AnswerFor<T extends ExerciseType> = z.infer<(typeof AnswerSchemas)[T]>;

export interface GradingResult {
  /** Entre 0 et 1 — l'appelant le multiplie par `maxScore`. */
  scoreRatio: number;
  correct: boolean;
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((n) => setA.has(n));
}

/**
 * Corrige une réponse contre le `payload` de l'exercice.
 *
 * Chaque branche est pure et déterministe : mêmes entrées, même résultat,
 * sans accès réseau ni horloge — c'est ce qui la rend testable en quelques
 * millisecondes et exécutable aussi bien côté client (aperçu) que serveur
 * (source de vérité).
 */
export function gradeExercise(
  exercise: ExerciseFrontmatter,
  rawAnswer: unknown,
): GradingResult {
  switch (exercise.type) {
    case "QUIZ_MCQ": {
      const answer = AnswerSchemas.QUIZ_MCQ.parse(rawAnswer);
      const correct = sameSet(exercise.correctIndices, answer.selectedIndices);
      return { scoreRatio: correct ? 1 : 0, correct };
    }
    case "QUIZ_TRUE_FALSE": {
      const answer = AnswerSchemas.QUIZ_TRUE_FALSE.parse(rawAnswer);
      const correct = answer.value === exercise.correct;
      return { scoreRatio: correct ? 1 : 0, correct };
    }
    case "QUIZ_MATCH": {
      const answer = AnswerSchemas.QUIZ_MATCH.parse(rawAnswer);
      const total = exercise.pairs.length;
      const matched = exercise.pairs.reduce(
        (count, _pair, i) => count + (answer.assignments[i] === i ? 1 : 0),
        0,
      );
      const scoreRatio = total === 0 ? 0 : matched / total;
      return { scoreRatio, correct: matched === total };
    }
    case "QUIZ_ORDER": {
      const answer = AnswerSchemas.QUIZ_ORDER.parse(rawAnswer);
      const total = exercise.items.length;
      const matched = exercise.items.reduce(
        (count, _item, i) => count + (answer.order[i] === i ? 1 : 0),
        0,
      );
      const scoreRatio = total === 0 ? 0 : matched / total;
      return { scoreRatio, correct: matched === total };
    }
    case "HOTSPOT": {
      const answer = AnswerSchemas.HOTSPOT.parse(rawAnswer);
      const selected = new Set(answer.selectedIndices);
      const totalCorrect = exercise.zones.filter((z) => z.correct).length;
      let hits = 0;
      let misses = 0;
      exercise.zones.forEach((zone, i) => {
        if (selected.has(i) && zone.correct) hits++;
        if (selected.has(i) && !zone.correct) misses++;
      });
      const scoreRatio =
        totalCorrect === 0 ? 0 : Math.max(0, (hits - misses) / totalCorrect);
      return { scoreRatio, correct: scoreRatio === 1 };
    }
    case "PALETTE": {
      const answer = AnswerSchemas.PALETTE.parse(rawAnswer);
      const correct = sameSet(exercise.correctIndices, answer.selectedIndices);
      return { scoreRatio: correct ? 1 : 0, correct };
    }
    case "MATERIAL_CHOICE": {
      const answer = AnswerSchemas.MATERIAL_CHOICE.parse(rawAnswer);
      const correct = answer.selectedIndex === exercise.correctIndex;
      return { scoreRatio: correct ? 1 : 0, correct };
    }
  }
}
