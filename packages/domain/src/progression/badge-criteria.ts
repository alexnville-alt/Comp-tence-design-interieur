import { z } from "zod";

/**
 * Critères de déblocage de badge (docs/05 M9, PROG-02).
 *
 * Trois formes seulement, chacune évaluable sans connaître le badge
 * particulier qui la porte — `evaluateBadge` est la même fonction pour les
 * ~16 badges du contenu (`curriculum/badges.ts`) : ajouter un badge n'ajoute
 * jamais de code d'évaluation, seulement une entrée déclarative.
 */
export const BadgeCriteriaSchema = z.discriminatedUnion("type", [
  /** Série courante d'au moins `days` jours. */
  z.object({ type: z.literal("streak"), days: z.number().int().positive() }),
  /** Niveau du parcours `level` (numéro, pas slug) terminé. */
  z.object({ type: z.literal("level_complete"), level: z.number().int().positive() }),
  /** Un compteur nommé, agrégé côté serveur (voir badge-context côté app), au moins égal à `gte`. */
  z.object({
    type: z.literal("count"),
    metric: z.string().trim().min(1),
    gte: z.number().int().positive(),
  }),
]);
export type BadgeCriteria = z.infer<typeof BadgeCriteriaSchema>;

export interface BadgeEvaluationContext {
  currentStreak: number;
  completedLevelNumbers: readonly number[];
  counts: Readonly<Record<string, number>>;
}

/** Pure : le contexte est assemblé par l'appelant (agrégations DB), jamais ici. */
export function evaluateBadge(
  criteria: BadgeCriteria,
  context: BadgeEvaluationContext,
): boolean {
  switch (criteria.type) {
    case "streak":
      return context.currentStreak >= criteria.days;
    case "level_complete":
      return context.completedLevelNumbers.includes(criteria.level);
    case "count":
      return (context.counts[criteria.metric] ?? 0) >= criteria.gte;
  }
}
