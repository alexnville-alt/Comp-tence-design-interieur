import { z } from "zod";

/**
 * Schémas des exercices (docs/05 M3).
 *
 * Chaque type porte ses champs à plat (pas de `payload` imbriqué) : c'est le
 * format d'auteur dans le frontmatter MDX, le même choix ergonomique que pour
 * le reste du contenu (ADR-0010). `registry.ts` sépare ensuite `prompt` du
 * reste avant d'écrire `Exercise.payload` en base.
 *
 * Les 7 types couverts ici sont corrigés de façon pure et synchrone
 * (`gradeExercise`, `grading.ts`). `OPEN_CASE` (M5, `open-case.ts`) est
 * délibérément **hors** de ce `discriminatedUnion` : sa correction appelle
 * `@atelier/ai`, donc ni pure ni synchrone — l'y forcer aurait cassé
 * l'exhaustivité de `gradeExercise` sur un type qu'elle ne peut pas traiter.
 * `LAYOUT` (atelier 2D, M4) reste hors périmètre : pas encore intégré comme
 * type d'exercice de leçon — voir le rapport de livraison M3.
 */

export const slugSchema = z
  .string()
  .min(1, "Le slug ne peut pas être vide.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Le slug doit être en minuscules, sans accents ni espaces.",
  );

const exerciseBase = {
  slug: slugSchema,
  prompt: z.string().trim().min(1, "L'énoncé ne peut pas être vide."),
  explanation: z.string().trim().min(1, "L'explication ne peut pas être vide."),
  maxScore: z.number().int().positive().default(100),
  xpReward: z.number().int().nonnegative().default(10),
};

export const QuizMcqSchema = z.object({
  ...exerciseBase,
  type: z.literal("QUIZ_MCQ"),
  choices: z.array(z.string().trim().min(1)).min(2, "Il faut au moins deux choix."),
  correctIndices: z
    .array(z.number().int().nonnegative())
    .min(1, "Il faut au moins une bonne réponse."),
});

export const QuizTrueFalseSchema = z.object({
  ...exerciseBase,
  type: z.literal("QUIZ_TRUE_FALSE"),
  statement: z.string().trim().min(1),
  correct: z.boolean(),
});

export const QuizMatchSchema = z.object({
  ...exerciseBase,
  type: z.literal("QUIZ_MATCH"),
  // `pairs[i]` associe `left` et `right` — l'ordre déclaré EST la bonne
  // réponse ; l'interface mélange la colonne de droite à l'affichage.
  pairs: z
    .array(z.object({ left: z.string().trim().min(1), right: z.string().trim().min(1) }))
    .min(2, "Il faut au moins deux paires."),
});

export const QuizOrderSchema = z.object({
  ...exerciseBase,
  type: z.literal("QUIZ_ORDER"),
  // `items` est déclaré dans le bon ordre ; l'interface le mélange à
  // l'affichage. Pas de champ `correctOrder` séparé : une seule source de
  // vérité, impossible à désynchroniser.
  items: z.array(z.string().trim().min(1)).min(2, "Il faut au moins deux éléments."),
});

export const HotspotSchema = z.object({
  ...exerciseBase,
  type: z.literal("HOTSPOT"),
  imageLabel: z.string().trim().min(1),
  zones: z
    .array(
      z.object({
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        radius: z.number().positive().max(50),
        label: z.string().trim().min(1),
        correct: z.boolean(),
      }),
    )
    .min(2, "Il faut au moins deux zones."),
});

export const PaletteSchema = z.object({
  ...exerciseBase,
  type: z.literal("PALETTE"),
  brief: z.string().trim().min(1),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        hex: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale attendue (#rrggbb)."),
      }),
    )
    .min(2),
  correctIndices: z.array(z.number().int().nonnegative()).min(1),
});

export const MaterialChoiceSchema = z.object({
  ...exerciseBase,
  type: z.literal("MATERIAL_CHOICE"),
  scenario: z.string().trim().min(1),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        description: z.string().trim().min(1),
      }),
    )
    .min(2),
  correctIndex: z.number().int().nonnegative(),
});

export const ExerciseFrontmatterSchema = z.discriminatedUnion("type", [
  QuizMcqSchema,
  QuizTrueFalseSchema,
  QuizMatchSchema,
  QuizOrderSchema,
  HotspotSchema,
  PaletteSchema,
  MaterialChoiceSchema,
]);

export type ExerciseFrontmatter = z.infer<typeof ExerciseFrontmatterSchema>;
export type ExerciseType = ExerciseFrontmatter["type"];

export const EXERCISE_TYPES = [
  "QUIZ_MCQ",
  "QUIZ_TRUE_FALSE",
  "QUIZ_MATCH",
  "QUIZ_ORDER",
  "HOTSPOT",
  "PALETTE",
  "MATERIAL_CHOICE",
] as const;

/**
 * Vérifie les renvois internes qu'un schéma Zod à discriminant ne peut pas
 * exprimer sans perdre le typage du discriminant (`correctIndices` doit
 * pointer vers un `choices` existant, etc.) — même logique que
 * `validateBlockNumbering` : un contrôle explicite plutôt qu'un
 * `.refine()` qui casserait `discriminatedUnion`.
 */
export function validateExerciseIntegrity(exercise: ExerciseFrontmatter): string | null {
  switch (exercise.type) {
    case "QUIZ_MCQ":
      return exercise.correctIndices.some((i) => i >= exercise.choices.length)
        ? `correctIndices référence un choix inexistant (choices en compte ${exercise.choices.length}).`
        : null;
    case "PALETTE":
      return exercise.correctIndices.some((i) => i >= exercise.options.length)
        ? `correctIndices référence une option inexistante (options en compte ${exercise.options.length}).`
        : null;
    case "MATERIAL_CHOICE":
      return exercise.correctIndex >= exercise.options.length
        ? `correctIndex référence une option inexistante (options en compte ${exercise.options.length}).`
        : null;
    case "HOTSPOT":
      return exercise.zones.every((zone) => !zone.correct)
        ? "au moins une zone doit être correcte."
        : null;
    case "QUIZ_TRUE_FALSE":
    case "QUIZ_MATCH":
    case "QUIZ_ORDER":
      return null;
  }
}
