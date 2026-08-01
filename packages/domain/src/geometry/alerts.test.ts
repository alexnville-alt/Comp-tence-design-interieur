import { describe, expect, it } from "vitest";
import { analyzeSceneAlerts } from "./alerts";
import { emptyScene, type Scene } from "./scene-schema";

describe("analyzeSceneAlerts", () => {
  it("ne remonte rien sur une scène vide", () => {
    expect(analyzeSceneAlerts(emptyScene())).toHaveLength(0);
  });

  it("signale une porte hors des limites du mur", () => {
    const scene: Scene = {
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
          offsetCm: 380,
          widthCm: 90,
          heightCm: 204,
          sillCm: 0,
        },
      ],
    };
    const alerts = analyzeSceneAlerts(scene);
    expect(alerts).toContainEqual(
      expect.objectContaining({ kind: "opening", severity: "critical" }),
    );
  });

  it("signale une collision entre deux meubles", () => {
    const scene: Scene = {
      ...emptyScene(),
      furniture: [
        {
          id: "a",
          label: "Canapé",
          footprint: { w: 200, d: 90, h: 85 },
          position: { x: 100, y: 100 },
          rotation: 0,
        },
        {
          id: "b",
          label: "Fauteuil",
          footprint: { w: 80, d: 85, h: 90 },
          position: { x: 120, y: 100 },
          rotation: 0,
        },
      ],
    };
    const alerts = analyzeSceneAlerts(scene);
    expect(alerts).toContainEqual(
      expect.objectContaining({ kind: "collision", severity: "critical" }),
    );
  });

  it("signale un dégagement obstrué", () => {
    const scene: Scene = {
      ...emptyScene(),
      furniture: [
        {
          id: "armoire",
          label: "Armoire",
          footprint: { w: 100, d: 60, h: 200 },
          position: { x: 100, y: 100 },
          rotation: 0,
          clearance: { front: 90, sides: 0 },
        },
        {
          id: "obstacle",
          label: "Table",
          footprint: { w: 60, d: 60, h: 75 },
          position: { x: 100, y: 170 },
          rotation: 0,
        },
      ],
    };
    const alerts = analyzeSceneAlerts(scene);
    expect(alerts).toContainEqual(
      expect.objectContaining({ kind: "clearance", severity: "warning" }),
    );
  });

  it("signale un passage réduit entre deux portes", () => {
    // Pièce de 300×300 avec deux portes en vis-à-vis et un meuble qui
    // rétrécit fortement le couloir entre les deux.
    const scene: Scene = {
      ...emptyScene(),
      walls: [
        {
          id: "n",
          a: { x: 0, y: 0 },
          b: { x: 300, y: 0 },
          thickness: 10,
          structural: false,
        },
        {
          id: "e",
          a: { x: 300, y: 0 },
          b: { x: 300, y: 300 },
          thickness: 10,
          structural: false,
        },
        {
          id: "s",
          a: { x: 300, y: 300 },
          b: { x: 0, y: 300 },
          thickness: 10,
          structural: false,
        },
        {
          id: "w",
          a: { x: 0, y: 300 },
          b: { x: 0, y: 0 },
          thickness: 10,
          structural: false,
        },
      ],
      openings: [
        {
          id: "porte-n",
          wallId: "n",
          kind: "door",
          offsetCm: 105,
          widthCm: 90,
          heightCm: 204,
          sillCm: 0,
        },
        {
          id: "porte-s",
          wallId: "s",
          kind: "door",
          offsetCm: 105,
          widthCm: 90,
          heightCm: 204,
          sillCm: 0,
        },
      ],
      furniture: [
        {
          id: "obstacle",
          label: "Bibliothèque",
          footprint: { w: 260, d: 30, h: 200 },
          position: { x: 150, y: 150 },
          rotation: 0,
        },
      ],
    };
    const alerts = analyzeSceneAlerts(scene);
    expect(alerts).toContainEqual(expect.objectContaining({ kind: "circulation" }));
  });
});
