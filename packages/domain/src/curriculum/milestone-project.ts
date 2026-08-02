import { z } from "zod";

/**
 * Projets jalons (docs/06 §2, M11) — un par phase, conclut les niveaux qui la
 * composent. Contenu déclaratif (le brief), pas un mécanisme applicatif : le
 * projet jalon guide l'apprenant à utiliser l'atelier (M4), les générateurs
 * (M8) et éventuellement le projet personnel (M10) sur son propre logement —
 * il n'ajoute aucune nouvelle mécanique de suivi, volontairement, pour rester
 * du contenu au sens strict de ce module.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .min(1, "Le slug ne peut pas être vide.")
  .regex(
    SLUG_PATTERN,
    "Le slug doit être en minuscules, sans accents ni espaces (ex. « reamenager-une-piece-simple »).",
  );

export const MilestoneProjectFrontmatterSchema = z.object({
  slug: slugSchema,
  phase: z.number().int().min(1).max(4, "La phase doit être comprise entre 1 et 4."),
  title: z.string().trim().min(1, "Le titre ne peut pas être vide."),
  brief: z.string().trim().min(1, "Le brief ne peut pas être vide."),
  deliverables: z
    .array(z.string().trim().min(1))
    .min(1, "Au moins un livrable est requis."),
  evaluationCriteria: z
    .array(z.string().trim().min(1))
    .min(1, "Au moins un critère d'évaluation est requis."),
});

export type MilestoneProjectFrontmatter = z.infer<
  typeof MilestoneProjectFrontmatterSchema
>;
