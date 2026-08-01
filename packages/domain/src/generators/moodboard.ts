import { z } from "zod";
import { PaletteGenerationSchema } from "./palette";

/**
 * Génération de moodboard (docs/05 M8) : palette + sélection de matériaux,
 * éclairage, accessoires et végétaux — quatre catégories qui correspondent
 * directement à quatre `LibCategory` (`@atelier/domain/library`) : MATERIAL,
 * LIGHTING, ACCESSORY, PLANT.
 *
 * Le schéma de sélection n'est **pas** une constante : `buildMoodboardSelectionSchema`
 * le construit à partir des candidats réellement trouvés en bibliothèque pour
 * cette pièce (recherche par catégorie + type de pièce, côté application).
 * Chaque champ de catégorie est un `z.enum` des seuls slugs candidats — Zod
 * rejette donc mécaniquement toute réponse qui invente une fiche, exactement
 * comme le reste de la validation IA du projet (ADR-0005 niveau 3) : une
 * sélection hors schéma déclenche la reprise automatique déjà câblée dans
 * `runStructured` (`packages/ai`), pas un filtrage après coup qui laisserait
 * passer une fiche halluciné jusqu'à l'affichage.
 *
 * `null` est une réponse valide par catégorie : rien en bibliothèque ne
 * convient à cette pièce, pas d'invention pour combler (AI-02).
 */

export const MOODBOARD_CATEGORIES = [
  "MATERIAL",
  "LIGHTING",
  "ACCESSORY",
  "PLANT",
] as const;
export type MoodboardCategory = (typeof MOODBOARD_CATEGORIES)[number];

export interface MoodboardCandidate {
  slug: string;
  name: string;
  summary: string;
}

const SelectionSchema = z.object({
  slug: z.string().min(1),
  justification: z.string().trim().min(1),
});
export type MoodboardSelection = z.infer<typeof SelectionSchema>;

/**
 * @param candidatesByCategory Une entrée par catégorie qui a au moins un
 * candidat — une catégorie absente de l'objet n'a tout simplement rien à
 * recommander (pas de champ `null` à valider pour elle).
 */
export function buildMoodboardSelectionSchema(
  candidatesByCategory: Partial<Record<MoodboardCategory, MoodboardCandidate[]>>,
) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const category of MOODBOARD_CATEGORIES) {
    const candidates = candidatesByCategory[category];
    if (!candidates || candidates.length === 0) continue;

    const slugs = candidates.map((c) => c.slug) as [string, ...string[]];
    shape[category] = z
      .object({ slug: z.enum(slugs), justification: SelectionSchema.shape.justification })
      .nullable();
  }

  return z.object(shape);
}

export function buildMoodboardGenerationSchema(
  candidatesByCategory: Partial<Record<MoodboardCategory, MoodboardCandidate[]>>,
) {
  return z.object({
    palette: PaletteGenerationSchema,
    selections: buildMoodboardSelectionSchema(candidatesByCategory),
    synthese: z.string().trim().min(1),
  });
}

export type MoodboardGeneration = z.infer<
  ReturnType<typeof buildMoodboardGenerationSchema>
>;
