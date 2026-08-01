import { describe, expect, it } from "vitest";
import type { Opening, Wall } from "./scene-schema";
import {
  isOpeningWithinWall,
  openingsOverlap,
  pointAtOffset,
  validateSceneOpenings,
  validateWallOpenings,
} from "./openings";

const wall: Wall = {
  id: "w0",
  a: { x: 0, y: 0 },
  b: { x: 400, y: 0 },
  thickness: 10,
  structural: false,
};

function door(id: string, offsetCm: number, widthCm = 90): Opening {
  return {
    id,
    wallId: wall.id,
    kind: "door",
    offsetCm,
    widthCm,
    heightCm: 204,
    sillCm: 0,
  };
}

describe("pointAtOffset", () => {
  it("place un point au milieu d'un mur horizontal", () => {
    expect(pointAtOffset(wall, 200)).toEqual({ x: 200, y: 0 });
  });
});

describe("isOpeningWithinWall", () => {
  it("accepte une porte entièrement sur le mur", () => {
    expect(isOpeningWithinWall(wall, door("d1", 50, 90))).toBe(true);
  });

  it("refuse une porte qui commence avant le mur", () => {
    expect(isOpeningWithinWall(wall, door("d1", -10, 90))).toBe(false);
  });

  it("refuse une porte qui dépasse la fin du mur", () => {
    expect(isOpeningWithinWall(wall, door("d1", 350, 90))).toBe(false); // 350+90 > 400
  });

  it("accepte une porte qui touche exactement les bords du mur", () => {
    expect(isOpeningWithinWall(wall, door("d1", 0, 400))).toBe(true);
  });
});

describe("openingsOverlap", () => {
  it("détecte un chevauchement", () => {
    expect(openingsOverlap(door("d1", 50, 90), door("d2", 100, 90))).toBe(true);
  });

  it("n'y voit pas de chevauchement quand les ouvertures sont adjacentes", () => {
    expect(openingsOverlap(door("d1", 50, 90), door("d2", 140, 90))).toBe(false);
  });

  it("n'y voit pas de chevauchement quand les ouvertures sont éloignées", () => {
    expect(openingsOverlap(door("d1", 0, 90), door("d2", 300, 90))).toBe(false);
  });
});

describe("validateWallOpenings / validateSceneOpenings", () => {
  it("ne remonte aucun problème pour des portes valides et disjointes", () => {
    const issues = validateWallOpenings(wall, [door("d1", 0, 90), door("d2", 200, 90)]);
    expect(issues).toHaveLength(0);
  });

  it("signale une porte hors des limites du mur", () => {
    const issues = validateWallOpenings(wall, [door("d1", 350, 90)]);
    expect(issues).toEqual([
      { openingId: "d1", code: "OUT_OF_BOUNDS", message: expect.any(String) },
    ]);
  });

  it("signale un chevauchement entre deux portes", () => {
    const issues = validateWallOpenings(wall, [door("d1", 0, 100), door("d2", 50, 90)]);
    expect(issues.some((i) => i.code === "OVERLAPS")).toBe(true);
  });

  it("agrège les problèmes de toute la scène, regroupés par mur", () => {
    const otherWall: Wall = {
      id: "w1",
      a: { x: 400, y: 0 },
      b: { x: 400, y: 300 },
      thickness: 10,
      structural: false,
    };
    const issues = validateSceneOpenings(
      [wall, otherWall],
      [door("d1", 350, 90), { ...door("d2", 50, 90), wallId: otherWall.id }],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.openingId).toBe("d1");
  });
});
