import { z } from "zod";

/**
 * Schémas de contenu pédagogique — leçons et chapitres.
 *
 * Ces règles de forme (un slug se compose de minuscules et de tirets, une
 * leçon dure un nombre positif de minutes…) sont indépendantes du format de
 * fichier choisi pour les auteurs (MDX, ADR-0010) : elles décrivent ce qu'une
 * leçon *est*, pas comment elle est stockée. C'est pourquoi elles vivent ici
 * plutôt que dans la couche de lecture MDX de l'application (qui, elle,
 * dépend de `next-mdx-remote` et n'a rien d'un paquet « métier pur »).
 *
 * Le même schéma valide le frontmatter au moment de la synchronisation
 * (`apps/web/scripts/sync-content.ts`) et pourrait, plus tard, valider un
 * formulaire d'édition — une seule définition, comme pour l'onboarding
 * (ADR-0009).
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .min(1, "Le slug ne peut pas être vide.")
  .regex(
    SLUG_PATTERN,
    "Le slug doit être en minuscules, sans accents ni espaces (ex. « quest-ce-qu-un-espace-reussi »).",
  );

export const LessonFrontmatterSchema = z.object({
  slug: slugSchema,
  number: z.number().int().positive("Le numéro de leçon doit être un entier positif."),
  title: z.string().trim().min(1, "Le titre ne peut pas être vide."),
  summary: z.string().trim().min(1, "Le résumé ne peut pas être vide."),
  minutes: z.number().int().positive("La durée doit être un nombre positif de minutes."),
  xpReward: z.number().int().nonnegative().default(20),
  /// Structure prête, contenu vide en V1 (LEARN-03) — absent tant qu'aucune
  /// vidéo n'existe, jamais une chaîne vide.
  videoUrl: z.string().url("videoUrl doit être une URL valide.").optional(),
  published: z.boolean().default(true),
});

export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;

export const ChapterMetaSchema = z.object({
  number: z.number().int().positive("Le numéro de chapitre doit être un entier positif."),
  slug: slugSchema,
  title: z.string().trim().min(1, "Le titre du chapitre ne peut pas être vide."),
});

export type ChapterMeta = z.infer<typeof ChapterMetaSchema>;

/**
 * Les 11 types de blocs pédagogiques (docs/06 §1.2 — anatomie d'une leçon).
 * Cette liste est la source de vérité partagée entre :
 *   - la validation de la numérotation des blocs (apps/web/src/lib/content/blocks.ts) ;
 *   - les composants MDX qui les rendent (apps/web/src/lib/content/mdx-components.tsx).
 * Elle vit ici (et non côté application) car c'est une décision de contenu —
 * « quels types de blocs existent » — indépendante du moteur de rendu.
 */
export const LESSON_BLOCK_COMPONENTS = [
  "Texte",
  "ImageAnnotee",
  "Schema",
  "AvantApres",
  "ErreurFrequente",
  "ConseilDePro",
  "InterieurCelebre",
  "ARetenir",
  "TableauComparatif",
  "EmplacementVideo",
  "AllerPlusLoin",
] as const;

export type LessonBlockComponent = (typeof LESSON_BLOCK_COMPONENTS)[number];
