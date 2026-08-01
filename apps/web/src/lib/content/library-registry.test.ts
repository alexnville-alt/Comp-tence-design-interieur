import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ContentValidationError } from "./frontmatter";
import { scanLibrary } from "./library-registry";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function makeContentRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "atelier-library-"));
  tempDirs.push(dir);
  return dir;
}

const VALID_FRONTMATTER = `---
slug: chene-huile
name: Chêne huilé
summary: Parquet massif chaud et réparable localement.
description: Le chêne huilé est un parquet massif traité à l'huile.
pros:
  - Réparable localement
cons:
  - Entretien régulier
budgetTier: PREMIUM
maintenance: Huilage tous les 1 à 2 ans.
mistakes:
  - Poser sans acclimatation
category: WOOD
attributes:
  species: Chêne
  jankaHardness: 1360
  grain: medium
  priceIndex: 4
---
`;

function writeFiche(
  root: string,
  folder: string,
  filename: string,
  content: string,
): string {
  const dir = join(root, "bibliotheque", folder);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, filename);
  writeFileSync(filePath, content);
  return filePath;
}

describe("scanLibrary", () => {
  it("lit une fiche valide et retourne son frontmatter typé", () => {
    const root = makeContentRoot();
    writeFiche(root, "wood", "chene-huile.mdx", VALID_FRONTMATTER);

    const items = scanLibrary(root);
    expect(items).toHaveLength(1);
    expect(items[0]!.frontmatter.slug).toBe("chene-huile");
    expect(items[0]!.frontmatter.category).toBe("WOOD");
  });

  it("lit plusieurs catégories dans des dossiers différents", () => {
    const root = makeContentRoot();
    writeFiche(root, "wood", "chene-huile.mdx", VALID_FRONTMATTER);
    writeFiche(
      root,
      "color",
      "blanc-casse.mdx",
      `---
slug: blanc-casse
name: Blanc cassé
summary: Blanc chaud, doux.
description: Un blanc légèrement teinté, moins clinique qu'un blanc pur.
pros:
  - Lumineux sans être froid
cons:
  - Salit visiblement
budgetTier: ECONOMY
maintenance: Lessivable en finition satinée.
mistakes:
  - Le confondre avec un blanc pur en finition mate
category: COLOR
attributes:
  hex: "#F2EEE4"
  oklch: { l: 0.94, c: 0.01, h: 80 }
  undertone: warm
  lrv: 85
---
`,
    );

    const items = scanLibrary(root);
    expect(items.map((i) => i.frontmatter.slug).sort()).toEqual([
      "blanc-casse",
      "chene-huile",
    ]);
  });

  it("rejette un frontmatter invalide avec le chemin du fichier fautif", () => {
    const root = makeContentRoot();
    const filePath = writeFiche(
      root,
      "wood",
      "invalide.mdx",
      `---
slug: "Pas Un Slug"
name: Test
---
`,
    );

    expect(() => scanLibrary(root)).toThrowError(ContentValidationError);
    try {
      scanLibrary(root);
    } catch (error) {
      expect(error).toBeInstanceOf(ContentValidationError);
      expect((error as ContentValidationError).message).toContain(filePath);
    }
  });

  it("rejette une fiche rangée dans le mauvais dossier de catégorie", () => {
    const root = makeContentRoot();
    writeFiche(root, "color", "chene-huile.mdx", VALID_FRONTMATTER); // WOOD dans le dossier color

    expect(() => scanLibrary(root)).toThrowError(/attendu : « wood »/);
  });

  it("rejette deux fiches avec le même slug", () => {
    const root = makeContentRoot();
    writeFiche(root, "wood", "a.mdx", VALID_FRONTMATTER);
    writeFiche(root, "wood", "b.mdx", VALID_FRONTMATTER);

    expect(() => scanLibrary(root)).toThrowError(/déjà utilisé/);
  });
});
