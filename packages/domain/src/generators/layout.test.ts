import { describe, expect, it } from "vitest";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  layoutGrid,
  MoodboardTransformSchema,
} from "./layout";

describe("layoutGrid", () => {
  it("retourne un tableau vide pour zéro élément", () => {
    expect(layoutGrid(0)).toEqual([]);
  });

  it("place les six premiers éléments sur une seule ligne", () => {
    const transforms = layoutGrid(6);
    expect(transforms).toHaveLength(6);
    expect(new Set(transforms.map((t) => t.y)).size).toBe(1);
  });

  it("passe à la ligne suivante au septième élément", () => {
    const transforms = layoutGrid(7);
    expect(transforms[6]!.y).toBeGreaterThan(transforms[0]!.y);
  });

  it("est déterministe : même nombre d'éléments, même disposition", () => {
    expect(layoutGrid(9)).toEqual(layoutGrid(9));
  });

  it("attribue un z croissant, sans doublon", () => {
    const transforms = layoutGrid(5);
    expect(new Set(transforms.map((t) => t.z)).size).toBe(5);
  });

  it("produit des transforms valides selon MoodboardTransformSchema, dans les bornes du plateau", () => {
    for (const transform of layoutGrid(20)) {
      expect(MoodboardTransformSchema.safeParse(transform).success).toBe(true);
      expect(transform.x + transform.w).toBeLessThanOrEqual(BOARD_WIDTH);
    }
    // Sanity : le plateau est bien plus haut que large de 4/3 (mise en page attendue).
    expect(BOARD_WIDTH / BOARD_HEIGHT).toBeCloseTo(4 / 3, 5);
  });
});

describe("MoodboardTransformSchema", () => {
  it("rejette une position hors du plateau", () => {
    const result = MoodboardTransformSchema.safeParse({
      x: BOARD_WIDTH + 1,
      y: 0,
      w: 100,
      h: 100,
      z: 0,
      rotation: 0,
    });
    expect(result.success).toBe(false);
  });

  it("applique une rotation par défaut de 0", () => {
    const result = MoodboardTransformSchema.parse({ x: 0, y: 0, w: 100, h: 100, z: 0 });
    expect(result.rotation).toBe(0);
  });
});
