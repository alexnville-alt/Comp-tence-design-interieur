import { describe, expect, it } from "vitest";
import type { Wall } from "./scene-schema";
import {
  polygonCentroid,
  roomAreaM2,
  roomPerimeterM,
  roomPolygon,
  snapPointToGrid,
  snapToGrid,
  wallAngleRad,
  wallLengthCm,
} from "./room";

function rectangleWalls(widthCm: number, depthCm: number): Wall[] {
  const corners = [
    { x: 0, y: 0 },
    { x: widthCm, y: 0 },
    { x: widthCm, y: depthCm },
    { x: 0, y: depthCm },
  ];
  return corners.map((a, i) => ({
    id: `w${i}`,
    a,
    b: corners[(i + 1) % corners.length]!,
    thickness: 10,
    structural: false,
  }));
}

describe("wallLengthCm / wallAngleRad", () => {
  it("mesure un mur horizontal de 400 cm", () => {
    const wall: Wall = {
      id: "w0",
      a: { x: 0, y: 0 },
      b: { x: 400, y: 0 },
      thickness: 10,
      structural: false,
    };
    expect(wallLengthCm(wall)).toBe(400);
    expect(wallAngleRad(wall)).toBe(0);
  });

  it("mesure un mur vertical de 300 cm à 90°", () => {
    const wall: Wall = {
      id: "w0",
      a: { x: 0, y: 0 },
      b: { x: 0, y: 300 },
      thickness: 10,
      structural: false,
    };
    expect(wallLengthCm(wall)).toBe(300);
    expect(wallAngleRad(wall)).toBeCloseTo(Math.PI / 2);
  });
});

describe("roomPolygon", () => {
  it("chaîne une boucle fermée de 4 murs en polygone", () => {
    const polygon = roomPolygon(rectangleWalls(400, 300));
    expect(polygon).toHaveLength(4);
  });

  it("retourne null si la boucle n'est pas fermée", () => {
    const walls = rectangleWalls(400, 300).slice(0, 3); // il manque le 4e mur
    expect(roomPolygon(walls)).toBeNull();
  });

  it("retourne null avec moins de 3 murs", () => {
    expect(roomPolygon(rectangleWalls(400, 300).slice(0, 2))).toBeNull();
  });
});

describe("roomAreaM2 / roomPerimeterM", () => {
  it("calcule la surface et le périmètre d'une pièce rectangulaire 4 × 3 m", () => {
    const walls = rectangleWalls(400, 300);
    expect(roomAreaM2(walls)).toBeCloseTo(12); // 4 m × 3 m
    expect(roomPerimeterM(walls)).toBeCloseTo(14); // 2 × (4 + 3)
  });

  it("retourne null pour une pièce non close", () => {
    const walls = rectangleWalls(400, 300).slice(0, 3);
    expect(roomAreaM2(walls)).toBeNull();
    expect(roomPerimeterM(walls)).toBeNull();
  });
});

describe("polygonCentroid", () => {
  it("trouve le centre d'un rectangle", () => {
    const polygon = roomPolygon(rectangleWalls(400, 300))!;
    expect(polygonCentroid(polygon)).toEqual({ x: 200, y: 150 });
  });
});

describe("snapToGrid / snapPointToGrid", () => {
  it("arrondit à la maille la plus proche", () => {
    expect(snapToGrid(23, 10)).toBe(20);
    expect(snapToGrid(27, 10)).toBe(30);
    expect(snapToGrid(15, 0)).toBe(15); // pas de magnétisme si grille nulle
  });

  it("arrondit un point sur les deux axes", () => {
    expect(snapPointToGrid({ x: 23, y: 58 }, 10)).toEqual({ x: 20, y: 60 });
  });
});
