import { z } from "zod";

/**
 * Schéma de la scène de l'atelier (docs/04 §4, M4).
 *
 * Source de vérité de `RoomVersion.sceneData`. `version` permet une migration
 * paresseuse à la lecture si la forme change un jour (docs/04 §7) — on ne
 * migre jamais un JSONB en SQL. Tout ce qui est calculable (surface,
 * circulation, collisions…) est volontairement absent de ce schéma : voir
 * `room.ts`, `openings.ts`, `collisions.ts` et `circulation.ts`.
 */

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Code couleur hexadécimal attendu (#rrggbb).");

export const FinishRefSchema = z.object({
  label: z.string().min(1),
  colorHex: hexColor,
  materialRef: z.string().optional(),
});
export type FinishRef = z.infer<typeof FinishRefSchema>;

export const WallSchema = z.object({
  id: z.string().min(1),
  a: PointSchema,
  b: PointSchema,
  thickness: z.number().positive().default(10),
  structural: z.boolean().default(false),
});
export type Wall = z.infer<typeof WallSchema>;

export const DoorTypeSchema = z.enum(["hinged", "sliding", "pocket"]);
export const SwingSchema = z.enum(["in-left", "in-right", "out-left", "out-right"]);

export const OpeningSchema = z.object({
  id: z.string().min(1),
  wallId: z.string().min(1),
  kind: z.enum(["door", "window", "opening"]),
  doorType: DoorTypeSchema.optional(),
  offsetCm: z.number().nonnegative(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  sillCm: z.number().nonnegative().default(0),
  swing: SwingSchema.optional(),
});
export type Opening = z.infer<typeof OpeningSchema>;

export const FurnitureItemSchema = z.object({
  id: z.string().min(1),
  catalogRef: z.string().optional(),
  label: z.string().min(1),
  footprint: z.object({
    w: z.number().positive(),
    d: z.number().positive(),
    h: z.number().positive(),
  }),
  position: PointSchema,
  rotation: z.number().default(0),
  materialRef: z.string().optional(),
  clearance: z
    .object({ front: z.number().nonnegative(), sides: z.number().nonnegative() })
    .optional(),
});
export type FurnitureItem = z.infer<typeof FurnitureItemSchema>;

export const LightingItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["ceiling", "wall", "floor", "table", "strip"]),
  position: PointSchema,
  lumens: z.number().optional(),
  kelvin: z.number().optional(),
});
export type LightingItem = z.infer<typeof LightingItemSchema>;

export const SceneSchema = z.object({
  version: z.literal(1),
  unit: z.literal("cm"),
  walls: z.array(WallSchema).default([]),
  openings: z.array(OpeningSchema).default([]),
  furniture: z.array(FurnitureItemSchema).default([]),
  finishes: z.object({
    floor: FinishRefSchema,
    ceiling: FinishRefSchema,
    walls: z.record(z.string(), FinishRefSchema).default({}),
  }),
  lighting: z.array(LightingItemSchema).default([]),
});
export type Scene = z.infer<typeof SceneSchema>;

const DEFAULT_FINISH: FinishRef = {
  label: "Blanc cassé",
  colorHex: "#f5f1ea",
};

/** Scène vide, point de départ d'une nouvelle pièce (`R` puis dessin des murs). */
export function emptyScene(): Scene {
  return {
    version: 1,
    unit: "cm",
    walls: [],
    openings: [],
    furniture: [],
    finishes: {
      floor: DEFAULT_FINISH,
      ceiling: DEFAULT_FINISH,
      walls: {},
    },
    lighting: [],
  };
}
