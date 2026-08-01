import { describe, expect, it } from "vitest";
import { checkRelationSymmetry } from "./relations";
import type { LibraryItemFrontmatter } from "./schema";

function item(
  overrides: Partial<LibraryItemFrontmatter> & { slug: string },
): LibraryItemFrontmatter {
  return {
    category: "WOOD",
    name: overrides.slug,
    summary: "s",
    description: "d",
    pros: ["p"],
    cons: ["c"],
    budgetTier: "MID",
    maintenance: "m",
    mistakes: ["e"],
    bestFor: [],
    styles: [],
    noWorksNeeded: false,
    pairsWith: [],
    avoidWith: [],
    cheaperAlt: [],
    premiumAlt: [],
    sameFamily: [],
    attributes: { species: "Chêne", jankaHardness: 1000, grain: "medium", priceIndex: 3 },
    ...overrides,
  } as LibraryItemFrontmatter;
}

describe("checkRelationSymmetry", () => {
  it("n'a aucune erreur quand toutes les relations sont réciproques", () => {
    const a = item({ slug: "a", pairsWith: ["b"], cheaperAlt: ["c"] });
    const b = item({ slug: "b", pairsWith: ["a"] });
    const c = item({ slug: "c", premiumAlt: ["a"] });
    expect(checkRelationSymmetry([a, b, c])).toEqual([]);
  });

  it("signale une relation symétrique non réciproque (pairsWith)", () => {
    const a = item({ slug: "a", pairsWith: ["b"] });
    const b = item({ slug: "b" });
    const errors = checkRelationSymmetry([a, b]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/« a ».*pairsWith.*« b »/);
  });

  it("signale une relation vers une fiche inexistante", () => {
    const a = item({ slug: "a", avoidWith: ["fantome"] });
    const errors = checkRelationSymmetry([a]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/fantome.*introuvable/);
  });

  it("signale un couple cheaperAlt/premiumAlt non inversé", () => {
    const a = item({ slug: "a", cheaperAlt: ["b"] });
    const b = item({ slug: "b" }); // ne déclare pas premiumAlt: [a]
    const errors = checkRelationSymmetry([a, b]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/cheaperAlt.*premiumAlt/);
  });

  it("signale un cheaperAlt/premiumAlt vers une fiche inexistante", () => {
    const a = item({ slug: "a", cheaperAlt: ["fantome"] });
    const errors = checkRelationSymmetry([a]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/fantome.*introuvable/);
  });

  it("accepte sameFamily réciproque et n'exige rien des non-relations", () => {
    const a = item({ slug: "a", sameFamily: ["b"] });
    const b = item({ slug: "b", sameFamily: ["a"] });
    expect(checkRelationSymmetry([a, b])).toEqual([]);
  });
});
