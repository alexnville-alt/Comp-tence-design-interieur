import { z } from "zod";
import { ExerciseFrontmatterSchema } from "../exercises/schema";

/**
 * Évaluation de fin de niveau (docs/05 M3).
 *
 * Authored comme un fichier de contenu (`_evaluation.yaml`, ADR-0010), pas
 * en base : mêmes raisons que le reste du contenu — relecture en pull
 * request, historique, aucun back-office à construire.
 */
export const AssessmentFrontmatterSchema = z.object({
  title: z.string().trim().min(1, "Le titre de l'évaluation ne peut pas être vide."),
  passingScore: z.number().int().min(0).max(100).default(70),
  exercises: z
    .array(ExerciseFrontmatterSchema)
    .min(1, "Une évaluation doit contenir au moins un exercice.")
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.slug)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "slug"],
            message: `Slug d'exercice en double dans l'évaluation : « ${item.slug} ».`,
          });
        }
        seen.add(item.slug);
      });
    }),
});

export type AssessmentFrontmatter = z.infer<typeof AssessmentFrontmatterSchema>;

/**
 * Score global d'une évaluation : moyenne pondérée par `maxScore` des scores
 * obtenus à chaque exercice (0 à 100).
 */
export function computeAssessmentScore(
  results: readonly { maxScore: number; scoreRatio: number }[],
): number {
  const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0);
  if (totalMax === 0) return 0;
  const totalScore = results.reduce((sum, r) => sum + r.maxScore * r.scoreRatio, 0);
  return Math.round((totalScore / totalMax) * 100);
}

export function hasPassedAssessment(score: number, passingScore: number): boolean {
  return score >= passingScore;
}
