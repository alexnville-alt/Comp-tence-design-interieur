import { z } from "zod";
import {
  HotspotSchema,
  MaterialChoiceSchema,
  PaletteSchema,
  QuizMatchSchema,
  QuizMcqSchema,
  QuizOrderSchema,
  QuizTrueFalseSchema,
  slugSchema,
} from "./schema";
import type { GradingResult } from "./grading";

/**
 * Cas pratique ouvert (OPEN_CASE, M5, docs/06 §1.3).
 *
 * Contrairement aux 7 types de `schema.ts`, il n'y a pas de bonne réponse à
 * comparer : la correction est un jugement, rendu par l'IA sur un barème
 * explicite (docs/02 §5.4 niveau 3 : sortie validée par `GradingFeedbackSchema`,
 * jamais du texte libre parsé à la main). C'est pour ça que ce type vit dans
 * son propre fichier plutôt que dans le `discriminatedUnion` de `schema.ts` —
 * voir la note en tête de ce fichier.
 */

export const OpenCaseFrontmatterSchema = z.object({
  slug: slugSchema,
  type: z.literal("OPEN_CASE"),
  prompt: z.string().trim().min(1, "L'énoncé ne peut pas être vide."),
  /** Le contexte du cas : la pièce, la famille, les contraintes du logement. */
  scenario: z.string().trim().min(1, "Le scénario ne peut pas être vide."),
  /** La contrainte précise posée à l'apprenant — 30 % du barème (docs/06 §1.3). */
  constraint: z.string().trim().min(1, "La contrainte ne peut pas être vide."),
  /**
   * Guidage d'auteur pour la correction IA (règles attendues, pièges
   * fréquents) : jamais envoyé au client, comme les clés de correction des
   * autres types — voir `toPublicOpenCase`.
   */
  gradingNotes: z
    .string()
    .trim()
    .min(1, "Les notes de correction ne peuvent pas être vides."),
  maxScore: z.number().int().positive().default(100),
  xpReward: z.number().int().nonnegative().default(10),
});

export type OpenCaseFrontmatter = z.infer<typeof OpenCaseFrontmatterSchema>;

/**
 * Superset des 8 types de contenu autorisés dans une évaluation ou une leçon
 * — utilisé uniquement pour **lire/valider le contenu d'auteur**
 * (`AssessmentFrontmatterSchema`, `apps/web/scripts/sync-content.ts`), jamais
 * pour la correction : `gradeExercise` (`grading.ts`) reste volontairement
 * borné aux 7 types purs, voir la note en tête de `schema.ts`.
 */
export const AnyExerciseFrontmatterSchema = z.discriminatedUnion("type", [
  QuizMcqSchema,
  QuizTrueFalseSchema,
  QuizMatchSchema,
  QuizOrderSchema,
  HotspotSchema,
  PaletteSchema,
  MaterialChoiceSchema,
  OpenCaseFrontmatterSchema,
]);

export type AnyExerciseFrontmatter = z.infer<typeof AnyExerciseFrontmatterSchema>;

/**
 * Le barème est **montré à l'apprenant avant qu'il ne réponde** (docs/06
 * §1.3) — à la différence du corrigé des 7 autres types, qui est retiré du
 * payload client (`toPublicExercise`, `public.ts`). Les poids somment à 1 ;
 * `open-case.test.ts` le vérifie.
 */
export const OPEN_CASE_RUBRIC = [
  { critere: "Réponse à la contrainte posée", poids: 0.3 },
  { critere: "Justification technique (règles invoquées)", poids: 0.25 },
  { critere: "Cohérence d'ensemble (style, matières, lumière)", poids: 0.2 },
  { critere: "Faisabilité (budget, mise en œuvre, entretien)", poids: 0.15 },
  { critere: "Qualité de la présentation (clarté, vocabulaire)", poids: 0.1 },
] as const;

export interface PublicOpenCaseExercise {
  type: "OPEN_CASE";
  slug: string;
  prompt: string;
  scenario: string;
  constraint: string;
  rubric: typeof OPEN_CASE_RUBRIC;
}

/** Projection envoyée au client : jamais `gradingNotes` (guidage de correction). */
export function toPublicOpenCase(exercise: OpenCaseFrontmatter): PublicOpenCaseExercise {
  return {
    type: "OPEN_CASE",
    slug: exercise.slug,
    prompt: exercise.prompt,
    scenario: exercise.scenario,
    constraint: exercise.constraint,
    rubric: OPEN_CASE_RUBRIC,
  };
}

/**
 * Sortie structurée attendue du fournisseur IA (docs/02 §5.3, docs/06 §1.3) :
 * toujours la note, deux points forts nommés, deux axes d'amélioration
 * actionnables, et la règle à réviser. `scoreRatio` (et non une note sur 20)
 * pour rester dans la même convention que `GradingResult` des 7 autres types
 * — l'appelant multiplie par `maxScore`, comme partout ailleurs.
 */
export const GradingFeedbackSchema = z.object({
  scoreRatio: z.number().min(0).max(1),
  pointsForts: z
    .array(z.string().trim().min(1))
    .length(2, "Exactement deux points forts, comme l'exige le barème (docs/06 §1.3)."),
  axesAmelioration: z
    .array(z.string().trim().min(1))
    .length(
      2,
      "Exactement deux axes d'amélioration, comme l'exige le barème (docs/06 §1.3).",
    ),
  regleAReviser: z.string().trim().min(1),
});

export type GradingFeedback = z.infer<typeof GradingFeedbackSchema>;

/**
 * Seuil de réussite d'un cas ouvert. Rien dans docs/06 ne fixe cette valeur
 * (le barème note en continu, il n'y a pas de bonne/mauvaise réponse
 * binaire) ; on reprend `Assessment.passingScore` par défaut (70 %, docs/04)
 * pour une seule notion de « réussite » cohérente dans tout le produit.
 */
const PASSING_RATIO = 0.7;

/**
 * Convertit le retour de l'IA, déjà validé par `GradingFeedbackSchema`, dans
 * la même forme que `gradeExercise` (`grading.ts`) — pure, elle ne fait
 * qu'appliquer `PASSING_RATIO` : l'appel au fournisseur IA lui-même vit dans
 * `@atelier/ai` / la Server Action (M5, hors de ce paquet — ADR-0009).
 */
export function gradingResultFromFeedback(feedback: GradingFeedback): GradingResult {
  return {
    scoreRatio: feedback.scoreRatio,
    correct: feedback.scoreRatio >= PASSING_RATIO,
  };
}
