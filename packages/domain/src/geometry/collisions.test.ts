import { describe, expect, it } from "vitest";
import type { FurnitureItem } from "./scene-schema";
import {
  detectClearanceViolations,
  detectFurnitureCollisions,
  furnitureCorners,
  polygonsIntersect,
} from "./collisions";

function sofa(
  id: string,
  x: number,
  y: number,
  rotation = 0,
  extra: Partial<FurnitureItem> = {},
): FurnitureItem {
  return {
    id,
    label: "Canapé",
    footprint: { w: 200, d: 90, h: 85 },
    position: { x, y },
    rotation,
    ...extra,
  };
}

describe("furnitureCorners", () => {
  it("place les 4 coins autour du centre sans rotation", () => {
    const corners = furnitureCorners(sofa("a", 100, 100));
    expect(corners).toEqual([
      { x: 0, y: 55 },
      { x: 200, y: 55 },
      { x: 200, y: 145 },
      { x: 0, y: 145 },
    ]);
  });

  it("pivote les coins de 90°", () => {
    const corners = furnitureCorners(sofa("a", 0, 0, 90));
    // largeur (200) devient verticale, profondeur (90) devient horizontale
    for (const corner of corners) {
      expect(Math.abs(corner.x)).toBeCloseTo(45, 5);
      expect(Math.abs(corner.y)).toBeCloseTo(100, 5);
    }
  });
});

describe("polygonsIntersect / detectFurnitureCollisions", () => {
  it("détecte deux meubles qui se chevauchent", () => {
    const a = sofa("a", 100, 100);
    const b = sofa("b", 150, 100);
    expect(polygonsIntersect(furnitureCorners(a), furnitureCorners(b))).toBe(true);
    expect(detectFurnitureCollisions([a, b])).toEqual([{ aId: "a", bId: "b" }]);
  });

  it("ne détecte rien pour deux meubles éloignés", () => {
    const a = sofa("a", 0, 0);
    const b = sofa("b", 1000, 1000);
    expect(detectFurnitureCollisions([a, b])).toHaveLength(0);
  });

  it("tient compte de la rotation (deux meubles disjoints à plat, qui se chevauchent une fois l'un pivoté)", () => {
    // Deux canapés 200×90, séparés de 40 cm sur l'axe y quand ils sont à
    // plat (pas de collision) ; en pivotant le second de 90°, son étendue en
    // y passe de 45 (demi-profondeur) à 100 (demi-largeur), ce qui suffit à
    // le faire chevaucher le premier.
    const a = sofa("a", 0, 0);
    const flat = sofa("b", 0, 130);
    expect(detectFurnitureCollisions([a, flat])).toHaveLength(0);

    const rotated = sofa("b", 0, 130, 90);
    expect(detectFurnitureCollisions([a, rotated])).toHaveLength(1);
  });
});

describe("detectClearanceViolations", () => {
  it("signale un dégagement obstrué par un autre meuble", () => {
    const table = sofa("table", 100, 100, 0, {
      footprint: { w: 120, d: 80, h: 75 },
      clearance: { front: 60, sides: 0 },
    });
    const chairInTheWay = sofa("chair", 100, 200, 0, {
      footprint: { w: 40, d: 40, h: 90 },
    });
    expect(detectClearanceViolations([table, chairInTheWay])).toEqual([
      { itemId: "table", blockedById: "chair" },
    ]);
  });

  it("ne signale rien quand le dégagement est libre", () => {
    const table = sofa("table", 100, 100, 0, {
      footprint: { w: 120, d: 80, h: 75 },
      clearance: { front: 60, sides: 0 },
    });
    expect(detectClearanceViolations([table])).toHaveLength(0);
  });
});
