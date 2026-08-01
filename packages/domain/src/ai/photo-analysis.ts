import { z } from "zod";

/**
 * Sortie structurée de l'analyse photo (M6, docs/02 §5.3, docs/05 M6).
 *
 * Étend l'exemple `AnalysePhoto` de docs/02 §5.3 sur trois points that le
 * texte de la feuille de route (docs/05 M6) demande mais que l'exemple, écrit
 * avant le détail du module, ne couvrait pas encore :
 *
 * 1. `lumiere` — un troisième constat (« style, proportions, circulation,
 *    **lumière**, problèmes gradués »), même forme que `proportions` et
 *    `circulation`.
 * 2. `problemes[].repere` et `.numero` — « repères numérotés positionnés sur
 *    l'image » : sans coordonnées, rien ne peut se positionner.
 * 3. Le discriminant `pertinente` — « une photo non pertinente (paysage) est
 *    détectée et signalée poliment ». Plutôt qu'un booléen à côté d'une
 *    analyse complète que le modèle devrait halluciner pour une photo hors
 *    sujet, une union discriminée : une photo non pertinente ne renvoie
 *    qu'un message, jamais de style/problèmes/améliorations inventés.
 */

const REPERE = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const NonPertinentePhotoSchema = z.object({
  pertinente: z.literal(false),
  /** Message poli affiché à la place de l'analyse — jamais une erreur technique. */
  raison: z.string().trim().min(1),
});

export const PertinentePhotoAnalysisSchema = z.object({
  pertinente: z.literal(true),
  styleDetecte: z.object({
    principal: z.string().trim().min(1),
    confiance: z.number().min(0).max(1),
  }),
  proportions: z.object({
    constat: z.string().trim().min(1),
    problemes: z.array(z.string().trim().min(1)),
  }),
  circulation: z.object({
    constat: z.string().trim().min(1),
    obstacles: z.array(z.string().trim().min(1)),
  }),
  lumiere: z.object({
    constat: z.string().trim().min(1),
    problemes: z.array(z.string().trim().min(1)),
  }),
  problemes: z.array(
    z.object({
      numero: z.number().int().positive(),
      titre: z.string().trim().min(1),
      gravite: z.enum(["mineur", "moyen", "majeur"]),
      /** AI-02 : toujours expliquer — jamais un intitulé sans justification. */
      pourquoi: z.string().trim().min(1),
      /** Position du repère numéroté sur l'image, en pourcentage (docs/05 M6). */
      repere: REPERE,
    }),
  ),
  ameliorations: z
    .array(
      z.object({
        action: z.string().trim().min(1),
        pourquoiCaMarche: z.string().trim().min(1),
        effort: z.enum(["immediat", "week-end", "travaux"]),
        budget: z.enum(["0-100", "100-500", "500-2000", "2000+"]),
      }),
    )
    .min(3),
  /** Synthèse « architecte ». */
  critique: z.string().trim().min(1),
});

// L'ordre des branches ne change rien à la validation (indexée par la valeur
// du discriminant, pas testée séquentiellement) — mais `PertinentePhoto...`
// en premier fait que l'adaptateur factice (déterministe, choisit toujours
// la première option d'une union) simule par défaut le cas d'usage principal
// plutôt que le cas de refus.
export const AnalysePhotoSchema = z.discriminatedUnion("pertinente", [
  PertinentePhotoAnalysisSchema,
  NonPertinentePhotoSchema,
]);

export type AnalysePhoto = z.infer<typeof AnalysePhotoSchema>;
export type PertinentePhotoAnalysis = z.infer<typeof PertinentePhotoAnalysisSchema>;
