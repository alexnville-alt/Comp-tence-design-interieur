import { z } from "zod";

/**
 * Plateau de moodboard (docs/05 M8) : un espace logique de 1600 × 1200
 * unités, indépendant du pixel écran — le zoom ou le redimensionnement de la
 * fenêtre ne change jamais les coordonnées stockées, seulement l'échelle de
 * rendu (même principe que `SceneSchema` en centimètres, M4).
 */
export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 1200;

export const MoodboardTransformSchema = z.object({
  x: z.number().min(0).max(BOARD_WIDTH),
  y: z.number().min(0).max(BOARD_HEIGHT),
  w: z.number().positive().max(BOARD_WIDTH),
  h: z.number().positive().max(BOARD_HEIGHT),
  /** Ordre d'empilement — plus grand = au-dessus. */
  z: z.number().int(),
  /** Degrés, sens horaire. */
  rotation: z.number().default(0),
});
export type MoodboardTransform = z.infer<typeof MoodboardTransformSchema>;

const ITEM_SIZE = 220;
const GAP = 24;
const COLUMNS = 6;

/**
 * Disposition initiale en grille, point de départ de l'édition libre — pas
 * un rendu final. Déterministe (même nombre d'items → même disposition), ce
 * qui la rend testable sans rien afficher.
 */
export function layoutGrid(count: number): MoodboardTransform[] {
  return Array.from({ length: count }, (_, i) => {
    const column = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    return {
      x: GAP + column * (ITEM_SIZE + GAP),
      y: GAP + row * (ITEM_SIZE + GAP),
      w: ITEM_SIZE,
      h: ITEM_SIZE,
      z: i,
      rotation: 0,
    };
  });
}
