import { describe, expect, it } from "vitest";
import type { FurnitureItem, Opening, Wall } from "./scene-schema";
import { CIRCULATION_MIN_CM, analyzeCirculation } from "./circulation";

// Pièce 5 × 3 m, une porte centrée sur le mur gauche, une porte centrée sur
// le mur droit — un couloir de circulation évident entre les deux.
const walls: Wall[] = [
  { id: "top", a: { x: 0, y: 0 }, b: { x: 500, y: 0 }, thickness: 10, structural: false },
  {
    id: "right",
    a: { x: 500, y: 0 },
    b: { x: 500, y: 300 },
    thickness: 10,
    structural: false,
  },
  {
    id: "bottom",
    a: { x: 500, y: 300 },
    b: { x: 0, y: 300 },
    thickness: 10,
    structural: false,
  },
  {
    id: "left",
    a: { x: 0, y: 300 },
    b: { x: 0, y: 0 },
    thickness: 10,
    structural: false,
  },
];

const doorLeft: Opening = {
  id: "door-left",
  wallId: "left",
  kind: "door",
  offsetCm: 105,
  widthCm: 90,
  heightCm: 204,
  sillCm: 0,
};

const doorRight: Opening = {
  id: "door-right",
  wallId: "right",
  kind: "door",
  offsetCm: 105,
  widthCm: 90,
  heightCm: 204,
  sillCm: 0,
};

describe("analyzeCirculation", () => {
  it("retourne null tant que la boucle de murs n'est pas fermée", () => {
    expect(analyzeCirculation(walls.slice(0, 3), [doorLeft, doorRight], [])).toBeNull();
  });

  it("ne retourne aucun passage s'il n'y a pas de porte", () => {
    expect(analyzeCirculation(walls, [], [])).toEqual([]);
  });

  it("trouve un passage confortable entre deux portes dans une pièce vide", () => {
    const passages = analyzeCirculation(walls, [doorLeft, doorRight], []);
    expect(passages).toHaveLength(1);
    const [passage] = passages!;
    expect(passage!.fromOpeningId).toBe("door-left");
    expect(passage!.toOpeningId).toBe("door-right");
    expect(passage!.widthCm).toBeGreaterThanOrEqual(CIRCULATION_MIN_CM);
    expect(passage!.severity).toBe("ok");
  });

  it("détecte un passage réduit quand du mobilier obstrue le couloir", () => {
    // Un meuble large posé au milieu de la pièce, sur toute sa hauteur sauf
    // une bande étroite, force le passage à se réduire nettement.
    const blocker: FurnitureItem = {
      id: "blocker",
      label: "Bibliothèque",
      footprint: { w: 40, d: 260, h: 200 },
      position: { x: 250, y: 130 },
      rotation: 0,
    };
    const openPassages = analyzeCirculation(walls, [doorLeft, doorRight], []);
    const blockedPassages = analyzeCirculation(walls, [doorLeft, doorRight], [blocker]);
    expect(blockedPassages).toHaveLength(1);
    expect(blockedPassages![0]!.widthCm).toBeLessThan(openPassages![0]!.widthCm);
    expect(blockedPassages![0]!.severity).not.toBe("ok");
  });

  it("mesure jusqu'au centre de la pièce quand il n'y a qu'une seule porte", () => {
    const passages = analyzeCirculation(walls, [doorLeft], []);
    expect(passages).toHaveLength(1);
    expect(passages![0]!.toOpeningId).toBeNull();
    expect(passages![0]!.widthCm).toBeGreaterThan(0);
  });
});
