import type { Exercise } from "@atelier/db";
import {
  ExerciseFrontmatterSchema,
  OpenCaseFrontmatterSchema,
  toPublicExercise,
  toPublicOpenCase,
} from "@atelier/domain";
import { ExercisePlayer } from "./exercise-player";
import { OpenCaseExercisePlayer } from "./open-case-player";

/**
 * Choisit le bon lecteur selon le type de l'exercice lu en base.
 *
 * Centralisé ici plutôt que dupliqué dans chaque page (leçon, évaluation) :
 * `OPEN_CASE` (M5) suit un chemin de correction entièrement différent des 7
 * types auto-corrigés — voir `open-case-player.tsx`.
 */
export function ExerciseBlock({ exercise }: { exercise: Exercise }) {
  if (exercise.type === "OPEN_CASE") {
    const parsed = OpenCaseFrontmatterSchema.safeParse(exercise.payload);
    if (!parsed.success) return null;
    return (
      <OpenCaseExercisePlayer
        exerciseId={exercise.id}
        exercise={toPublicOpenCase(parsed.data)}
      />
    );
  }

  const parsed = ExerciseFrontmatterSchema.safeParse(exercise.payload);
  if (!parsed.success) return null;
  return (
    <ExercisePlayer exerciseId={exercise.id} exercise={toPublicExercise(parsed.data)} />
  );
}
