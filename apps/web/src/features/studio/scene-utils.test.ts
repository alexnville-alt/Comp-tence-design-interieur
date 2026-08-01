import { describe, expect, it } from "vitest";
import { emptyScene, roomAreaM2, wallLengthCm, type Wall } from "@atelier/domain";
import {
  createFurnitureFromCatalog,
  createOpeningOnWall,
  createRectangularRoomWalls,
  defaultPlacementPoint,
} from "./scene-utils";

describe("createRectangularRoomWalls", () => {
  it("produit une boucle fermée de 4 murs dont la surface correspond aux cotations", () => {
    const walls = createRectangularRoomWalls(400, 300);
    expect(walls).toHaveLength(4);
    expect(roomAreaM2(walls)).toBeCloseTo(12);
  });

  it("applique l'épaisseur demandée à chaque mur", () => {
    const walls = createRectangularRoomWalls(400, 300, 15);
    expect(walls.every((w) => w.thickness === 15)).toBe(true);
  });
});

describe("createFurnitureFromCatalog", () => {
  it("crée un meuble à partir d'une entrée connue du catalogue", () => {
    const item = createFurnitureFromCatalog("canape-3-places", { x: 10, y: 20 });
    expect(item?.label).toBe("Canapé 3 places");
    expect(item?.footprint).toEqual({ w: 220, d: 95, h: 85 });
    expect(item?.position).toEqual({ x: 10, y: 20 });
  });

  it("retourne null pour un slug inconnu", () => {
    expect(createFurnitureFromCatalog("inconnu", { x: 0, y: 0 })).toBeNull();
  });
});

describe("createOpeningOnWall", () => {
  const wall: Wall = {
    id: "mur-1",
    a: { x: 0, y: 0 },
    b: { x: 400, y: 0 },
    thickness: 10,
    structural: false,
  };

  it("centre l'ouverture sur le mur quand aucun décalage n'est fourni", () => {
    const door = createOpeningOnWall(wall, "door");
    expect(door.wallId).toBe("mur-1");
    expect(door.widthCm).toBe(90);
    expect(door.offsetCm).toBeCloseTo((wallLengthCm(wall) - 90) / 2);
  });

  it("applique les valeurs par défaut d'une porte", () => {
    const door = createOpeningOnWall(wall, "door");
    expect(door.heightCm).toBe(204);
    expect(door.sillCm).toBe(0);
    expect(door.doorType).toBe("hinged");
    expect(door.swing).toBe("in-right");
  });

  it("applique les valeurs par défaut d'une fenêtre", () => {
    const window_ = createOpeningOnWall(wall, "window");
    expect(window_.widthCm).toBe(120);
    expect(window_.heightCm).toBe(120);
    expect(window_.sillCm).toBe(90);
    expect(window_.doorType).toBeUndefined();
  });

  it("borne le décalage demandé pour que l'ouverture reste dans le mur", () => {
    expect(createOpeningOnWall(wall, "door", -50).offsetCm).toBe(0);
    const maxOffset = wallLengthCm(wall) - 90;
    expect(createOpeningOnWall(wall, "door", 10_000).offsetCm).toBeCloseTo(maxOffset);
  });

  it("ne dépasse jamais le mur même pour une largeur supérieure à sa longueur", () => {
    const shortWall: Wall = { ...wall, b: { x: 50, y: 0 } };
    const door = createOpeningOnWall(shortWall, "door");
    expect(door.offsetCm).toBe(0);
  });
});

describe("defaultPlacementPoint", () => {
  it("propose le centre de la pièce quand les murs forment une boucle fermée", () => {
    const scene = { ...emptyScene(), walls: createRectangularRoomWalls(400, 300) };
    expect(defaultPlacementPoint(scene)).toEqual({ x: 200, y: 150 });
  });

  it("propose un point par défaut tant qu'il n'y a pas de pièce", () => {
    expect(defaultPlacementPoint(emptyScene())).toEqual({ x: 100, y: 100 });
  });

  it("décale légèrement chaque nouveau meuble pour éviter l'empilement exact", () => {
    const scene = {
      ...emptyScene(),
      furniture: [createFurnitureFromCatalog("chaise", { x: 0, y: 0 })!],
    };
    const point = defaultPlacementPoint(scene);
    expect(point).not.toEqual({ x: 100, y: 100 });
  });
});
