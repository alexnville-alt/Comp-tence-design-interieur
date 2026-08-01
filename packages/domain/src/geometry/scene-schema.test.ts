import { describe, expect, it } from "vitest";
import { SceneSchema, emptyScene } from "./scene-schema";

describe("SceneSchema", () => {
  it("valide une scène vide", () => {
    expect(SceneSchema.safeParse(emptyScene()).success).toBe(true);
  });

  it("valide une scène complète", () => {
    const scene = {
      ...emptyScene(),
      walls: [
        {
          id: "w0",
          a: { x: 0, y: 0 },
          b: { x: 400, y: 0 },
          thickness: 10,
          structural: false,
        },
      ],
      openings: [
        {
          id: "d0",
          wallId: "w0",
          kind: "door",
          doorType: "hinged",
          offsetCm: 50,
          widthCm: 90,
          heightCm: 204,
          sillCm: 0,
          swing: "in-left",
        },
      ],
      furniture: [
        {
          id: "f0",
          catalogRef: "canape-3-places",
          label: "Canapé",
          footprint: { w: 220, d: 95, h: 85 },
          position: { x: 100, y: 100 },
          rotation: 0,
        },
      ],
    };
    expect(SceneSchema.safeParse(scene).success).toBe(true);
  });

  it("rejette un code couleur invalide", () => {
    const scene = {
      ...emptyScene(),
      finishes: {
        ...emptyScene().finishes,
        floor: { label: "Chêne", colorHex: "pasunecouleur" },
      },
    };
    expect(SceneSchema.safeParse(scene).success).toBe(false);
  });

  it("rejette une version de scène inconnue", () => {
    expect(SceneSchema.safeParse({ ...emptyScene(), version: 2 }).success).toBe(false);
  });
});
