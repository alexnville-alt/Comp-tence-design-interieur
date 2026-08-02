import { z } from "zod";

/**
 * Défis hebdomadaires (docs/06 §4.3, M11) — contrainte imposée, format
 * court, corrigé par l'IA sur le même barème que les cas pratiques ouverts
 * (`OPEN_CASE_RUBRIC`, `exercises/open-case.ts`) : ce sont les deux seules
 * formes de correction jugée plutôt que comparée à une bonne réponse dans
 * l'application, il n'y a aucune raison d'avoir deux barèmes différents pour
 * la même nature d'exercice.
 *
 * Volontairement un modèle séparé de `Exercise` (packages/db/prisma/schema.prisma) :
 * un défi n'appartient à aucune leçon ni évaluation (`Exercise.lessonId`/
 * `assessmentId` sont tous deux `null` dans ce cas), ce qui affaiblirait les
 * contraintes d'unicité `@@unique([lessonId, slug])`/`@@unique([assessmentId,
 * slug])` — NULL n'est jamais égal à NULL en SQL, donc deux défis de même
 * slug ne seraient pas détectés par ces contraintes.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .min(1, "Le slug ne peut pas être vide.")
  .regex(
    SLUG_PATTERN,
    "Le slug doit être en minuscules, sans accents ni espaces (ex. « transformer-une-entree »).",
  );

export const ChallengeFrontmatterSchema = z.object({
  slug: slugSchema,
  weekIndex: z.number().int().positive("weekIndex doit être un entier positif."),
  title: z.string().trim().min(1, "Le titre ne peut pas être vide."),
  scenario: z.string().trim().min(1, "Le scénario ne peut pas être vide."),
  constraint: z.string().trim().min(1, "La contrainte ne peut pas être vide."),
  /** Guidage d'auteur pour la correction IA — jamais envoyé au client, comme `OpenCaseFrontmatter.gradingNotes`. */
  gradingNotes: z
    .string()
    .trim()
    .min(1, "Les notes de correction ne peuvent pas être vides."),
  maxScore: z.number().int().positive().default(100),
});

export type ChallengeFrontmatter = z.infer<typeof ChallengeFrontmatterSchema>;

export interface PublicChallenge {
  slug: string;
  weekIndex: number;
  title: string;
  scenario: string;
  constraint: string;
}

/** Projection envoyée au client : jamais `gradingNotes`, même principe que `toPublicOpenCase`. */
export function toPublicChallenge(challenge: ChallengeFrontmatter): PublicChallenge {
  return {
    slug: challenge.slug,
    weekIndex: challenge.weekIndex,
    title: challenge.title,
    scenario: challenge.scenario,
    constraint: challenge.constraint,
  };
}
