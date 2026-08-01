import { describe, expect, it } from "vitest";
import {
  computeContrastChecks,
  contrastRatio,
  PaletteGenerationSchema,
  type PaletteColor,
} from "./palette";

describe("contrastRatio", () => {
  it("noir sur blanc donne le ratio maximal WCAG (21:1)", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("une couleur avec elle-même donne un ratio de 1:1", () => {
    expect(contrastRatio("#3366CC", "#3366CC")).toBeCloseTo(1, 5);
  });

  it("est symétrique (l'ordre des couleurs ne change rien)", () => {
    expect(contrastRatio("#222222", "#EEEEEE")).toBeCloseTo(
      contrastRatio("#EEEEEE", "#222222"),
      10,
    );
  });

  it("reproduit un couple de référence WCAG connu (#767676 sur blanc ≈ 4.5:1)", () => {
    // Référence courante dans la documentation WCAG (limite AA pour texte normal).
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.5, 1);
  });
});

describe("computeContrastChecks", () => {
  const dominante: PaletteColor = {
    hex: "#1A1A1A",
    role: "dominante",
    justification: "Mur sombre pour un effet cocon.",
  };
  const accentClair: PaletteColor = {
    hex: "#F5F5F0",
    role: "accent",
    justification: "Contraste net pour les boiseries.",
  };
  const accentProche: PaletteColor = {
    hex: "#2A2A2A",
    role: "secondaire",
    justification: "Ton voisin pour une transition douce.",
  };

  it("compare chaque couleur à la dominante, jamais la dominante à elle-même", () => {
    const checks = computeContrastChecks([dominante, accentClair, accentProche]);
    expect(checks).toHaveLength(2);
    expect(checks.every((c) => c.colorHexA === dominante.hex)).toBe(true);
    expect(checks.map((c) => c.colorHexB).sort()).toEqual(
      [accentClair.hex, accentProche.hex].sort(),
    );
  });

  it("le ratio annoncé est exactement celui recalculé indépendamment (docs/05 M8, critère d'acceptation)", () => {
    const checks = computeContrastChecks([dominante, accentClair]);
    const expected = contrastRatio(dominante.hex, accentClair.hex);
    expect(checks[0]!.ratio).toBeCloseTo(expected, 2);
  });

  it("marque meetsAA/meetsAAA correctement au regard des seuils WCAG", () => {
    const checks = computeContrastChecks([dominante, accentClair]);
    expect(checks[0]!.ratio).toBeGreaterThan(7);
    expect(checks[0]!.meetsAA).toBe(true);
    expect(checks[0]!.meetsAAA).toBe(true);
  });

  it("un faible contraste est correctement signalé comme insuffisant", () => {
    const checks = computeContrastChecks([dominante, accentProche]);
    expect(checks[0]!.meetsAA).toBe(false);
    expect(checks[0]!.meetsAAA).toBe(false);
  });

  it("retourne un tableau vide si aucune couleur n'a le rôle dominante", () => {
    expect(computeContrastChecks([accentClair, accentProche])).toEqual([]);
  });
});

describe("PaletteGenerationSchema", () => {
  const baseColor = {
    hex: "#336699",
    role: "dominante" as const,
    justification: "Bleu profond, ancrage visuel.",
  };

  it("valide une palette de 3 à 6 couleurs avec justification", () => {
    const result = PaletteGenerationSchema.safeParse({
      colors: [
        baseColor,
        { ...baseColor, hex: "#FFFFFF", role: "neutre" },
        baseColor,
      ].map((c, i) => ({ ...c, hex: `#33669${i}` })),
      synthese: "Palette froide et apaisante pour un bureau.",
    });
    expect(result.success).toBe(true);
  });

  it("rejette moins de trois couleurs", () => {
    const result = PaletteGenerationSchema.safeParse({
      colors: [baseColor, { ...baseColor, hex: "#FFFFFF" }],
      synthese: "Trop court.",
    });
    expect(result.success).toBe(false);
  });

  it("rejette une couleur sans justification", () => {
    const result = PaletteGenerationSchema.safeParse({
      colors: [
        { hex: "#336699", role: "dominante", justification: "" },
        { hex: "#FFFFFF", role: "neutre", justification: "Neutre." },
        { hex: "#112233", role: "accent", justification: "Accent." },
      ],
      synthese: "Synthèse.",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un hex mal formé", () => {
    const result = PaletteGenerationSchema.safeParse({
      colors: [
        { hex: "bleu", role: "dominante", justification: "j" },
        { hex: "#FFFFFF", role: "neutre", justification: "j" },
        { hex: "#112233", role: "accent", justification: "j" },
      ],
      synthese: "s",
    });
    expect(result.success).toBe(false);
  });
});
