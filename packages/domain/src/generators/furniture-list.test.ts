import { describe, expect, it } from "vitest";
import type { FurnitureItem } from "../geometry/scene-schema";
import { buildFurnitureList } from "./furniture-list";

function chair(id: string, overrides: Partial<FurnitureItem> = {}): FurnitureItem {
  return {
    id,
    catalogRef: "chaise-bois-cannage",
    label: "Chaise en bois cannée",
    footprint: { w: 45, d: 52, h: 82 },
    position: { x: 0, y: 0 },
    rotation: 0,
    ...overrides,
  };
}

describe("buildFurnitureList", () => {
  it("regroupe les pièces identiques avec une quantité", () => {
    const furniture = [chair("a"), chair("b"), chair("c")];
    const entries = buildFurnitureList(furniture);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.quantity).toBe(3);
    expect(entries[0]!.label).toBe("Chaise en bois cannée");
  });

  it("ne regroupe pas des pièces de dimensions différentes même sous le même catalogRef", () => {
    const furniture = [chair("a"), chair("b", { footprint: { w: 50, d: 55, h: 82 } })];
    const entries = buildFurnitureList(furniture);
    expect(entries).toHaveLength(2);
  });

  it("regroupe par libellé quand il n'y a pas de catalogRef", () => {
    const furniture: FurnitureItem[] = [
      chair("a", { catalogRef: undefined, label: "Table sur mesure" }),
      chair("b", { catalogRef: undefined, label: "Table sur mesure" }),
    ];
    const entries = buildFurnitureList(furniture);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.quantity).toBe(2);
    expect(entries[0]!.catalogRef).toBeUndefined();
  });

  it("marque linkedToLibrary vrai seulement si le catalogRef existe dans les slugs fournis", () => {
    const furniture = [chair("a")];
    const linked = buildFurnitureList(furniture, new Set(["chaise-bois-cannage"]));
    expect(linked[0]!.linkedToLibrary).toBe(true);

    const unlinked = buildFurnitureList(furniture, new Set(["autre-slug"]));
    expect(unlinked[0]!.linkedToLibrary).toBe(false);
  });

  it("marque linkedToLibrary faux quand il n'y a pas de catalogRef", () => {
    const furniture: FurnitureItem[] = [chair("a", { catalogRef: undefined })];
    const entries = buildFurnitureList(furniture, new Set(["chaise-bois-cannage"]));
    expect(entries[0]!.linkedToLibrary).toBe(false);
  });

  it("trie le résultat par libellé", () => {
    const furniture = [
      chair("a", { catalogRef: "z", label: "Zeta" }),
      chair("b", { catalogRef: "m", label: "Alpha" }),
    ];
    const entries = buildFurnitureList(furniture);
    expect(entries.map((e) => e.label)).toEqual(["Alpha", "Zeta"]);
  });

  it("retourne un tableau vide pour une pièce sans mobilier", () => {
    expect(buildFurnitureList([])).toEqual([]);
  });
});
