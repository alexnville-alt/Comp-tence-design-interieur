import { describe, expect, it } from "vitest";
import { LIB_CATEGORIES, LibraryItemFrontmatterSchema } from "./schema";

function baseFields() {
  return {
    slug: "chene-huile",
    name: "Chêne huilé",
    summary: "Parquet massif chaud et facile à réparer localement.",
    description:
      "Le chêne huilé est un parquet massif traité à l'huile plutôt qu'au vernis : la protection pénètre le bois au lieu de former un film en surface.",
    pros: [
      "Réparable localement (une rayure ne nécessite pas de tout poncer)",
      "Vieillit avec patine",
    ],
    cons: [
      "Entretien régulier (huile à renouveler)",
      "Sensible aux taches d'eau si mal entretenu",
    ],
    budgetTier: "PREMIUM" as const,
    maintenance: "Huilage tous les 1 à 2 ans selon le passage.",
    mistakes: ["Poser sans acclimatation du bois à l'hygrométrie de la pièce"],
    bestFor: ["LIVING" as const, "BEDROOM" as const],
    styles: [],
    noWorksNeeded: false,
    pairsWith: [],
    avoidWith: [],
    cheaperAlt: [],
    premiumAlt: [],
    sameFamily: [],
  };
}

describe("LibraryItemFrontmatterSchema", () => {
  it("valide une fiche MATERIAL/WOOD complète", () => {
    const result = LibraryItemFrontmatterSchema.safeParse({
      ...baseFields(),
      category: "WOOD",
      attributes: {
        species: "Chêne",
        jankaHardness: 1360,
        grain: "medium",
        priceIndex: 4,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejette des attributs d'une autre catégorie (lumens sur du bois)", () => {
    const result = LibraryItemFrontmatterSchema.safeParse({
      ...baseFields(),
      category: "WOOD",
      attributes: {
        lumens: 800,
        kelvin: 3000,
        cri: 90,
        beamAngleDeg: 120,
        dimmable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejette un slug avec des majuscules ou des accents", () => {
    const result = LibraryItemFrontmatterSchema.safeParse({
      ...baseFields(),
      slug: "Chêne Huilé",
      category: "WOOD",
      attributes: {
        species: "Chêne",
        jankaHardness: 1360,
        grain: "medium",
        priceIndex: 4,
      },
    });
    expect(result.success).toBe(false);
  });

  it("exige au moins un avantage et un inconvénient", () => {
    const result = LibraryItemFrontmatterSchema.safeParse({
      ...baseFields(),
      pros: [],
      category: "WOOD",
      attributes: {
        species: "Chêne",
        jankaHardness: 1360,
        grain: "medium",
        priceIndex: 4,
      },
    });
    expect(result.success).toBe(false);
  });

  it("applique les valeurs par défaut (bestFor, styles, relations, noWorksNeeded)", () => {
    const {
      bestFor: _bestFor,
      styles: _styles,
      noWorksNeeded: _n,
      ...rest
    } = baseFields();
    const result = LibraryItemFrontmatterSchema.parse({
      ...rest,
      category: "WOOD",
      attributes: {
        species: "Chêne",
        jankaHardness: 1360,
        grain: "medium",
        priceIndex: 4,
      },
    });
    expect(result.bestFor).toEqual([]);
    expect(result.styles).toEqual([]);
    expect(result.noWorksNeeded).toBe(false);
  });

  it("couvre les 18 catégories avec un exemple minimal valide chacune", () => {
    const attributesByCategory: Record<(typeof LIB_CATEGORIES)[number], unknown> = {
      STYLE: {
        period: "Années 1950-60",
        keyElements: ["pieds compas"],
        typicalColors: ["moutarde"],
      },
      MATERIAL: { hardness: 3, waterResistance: "medium", thermalFeel: "neutral" },
      COLOR: {
        hex: "#EAE3D2",
        oklch: { l: 0.9, c: 0.02, h: 90 },
        undertone: "warm",
        lrv: 78,
      },
      WOOD: { species: "Chêne", jankaHardness: 1360, grain: "medium", priceIndex: 4 },
      STONE: { porosity: "low", finish: "poli", scratchResistance: 4 },
      FLOORING: {
        installType: "flottant",
        thicknessMm: 12,
        soundInsulation: "bonne",
        underfloorHeatingCompatible: true,
      },
      WALL_COVERING: { coverageM2PerUnit: 5, washable: true, pattern: "uni" },
      LIGHTING: { lumens: 800, kelvin: 3000, cri: 90, beamAngleDeg: 120, dimmable: true },
      SOFA: {
        seats: 3,
        dimensions: { w: 210, d: 95, h: 85 },
        seatHeightCm: 45,
        upholstery: "lin",
      },
      TABLE: { dimensions: { w: 160, d: 90, h: 75 }, shape: "rectangulaire" },
      CHAIR: { dimensions: { w: 45, d: 50, h: 80 }, seatHeightCm: 45, stackable: false },
      STORAGE: { dimensions: { w: 100, d: 40, h: 200 }, doors: 3 },
      KITCHEN: { configuration: "en-l", worktopMaterial: "quartz" },
      BATHROOM: { fixtureType: "vasque" },
      STAIRCASE: { type: "quart-tournant", material: "chêne", minWidthCm: 80 },
      TEXTILE: { fiber: "lin", washable: true },
      PLANT: { lightNeed: "moyenne", wateringFrequencyDays: 7, petSafe: true },
      ACCESSORY: { material: "laiton" },
    };

    for (const category of LIB_CATEGORIES) {
      const result: { success: boolean; error?: unknown } =
        LibraryItemFrontmatterSchema.safeParse({
          ...baseFields(),
          slug: `${baseFields().slug}-${category.toLowerCase().replace(/_/g, "-")}`,
          category,
          attributes: attributesByCategory[category],
        });
      expect(
        result.success,
        `catégorie ${category}: ${JSON.stringify(result.error)}`,
      ).toBe(true);
    }
  });

  it("infère un type discriminé par catégorie (contrôle de compilation)", () => {
    const item = LibraryItemFrontmatterSchema.parse({
      ...baseFields(),
      category: "WOOD",
      attributes: {
        species: "Chêne",
        jankaHardness: 1360,
        grain: "medium",
        priceIndex: 4,
      },
    });
    if (item.category === "WOOD") {
      expect(item.attributes.species).toBe("Chêne");
    }
  });
});
