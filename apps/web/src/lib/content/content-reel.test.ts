import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkRelationSymmetry, LIB_CATEGORIES } from "@atelier/domain";
import { scanLibrary } from "./library-registry";
import { scanContent } from "./registry";
import {
  scanChallenges,
  scanFamousInteriors,
  scanMilestoneProjects,
} from "./transverse-registry";

/**
 * Vérifie le contenu **réel** publié dans `content/` — pas des fixtures.
 *
 * Ce test tourne en CI à chaque commit : toute leçon mal formée (frontmatter
 * invalide, numérotation de bloc cassée, incohérence de slug) fait échouer
 * la CI avant même d'atteindre `content:sync`.
 */
const CONTENT_ROOT = join(__dirname, "..", "..", "..", "content");

describe("scanContent — contenu réel", () => {
  it("le contenu publié est valide", () => {
    expect(() => scanContent(CONTENT_ROOT)).not.toThrow();
  });

  it("le niveau 1 contient le chapitre et les 6 leçons attendues (docs/06, niveau complet)", () => {
    const registry = scanContent(CONTENT_ROOT);
    const decouverte = registry.levels.find((l) => l.slug === "decouverte");
    expect(decouverte?.chapters).toHaveLength(1);
    expect(decouverte?.chapters[0]?.lessons).toHaveLength(6);
    expect(decouverte?.chapters[0]?.lessons.map((l) => l.frontmatter.slug)).toEqual([
      "quest-ce-qu-un-espace-reussi",
      "le-vocabulaire-de-base",
      "apprendre-a-observer",
      "les-dix-erreurs-qui-ruinent-une-piece",
      "identifier-ce-qu-on-aime",
      "prendre-les-mesures-d-une-piece",
    ]);
  });

  it("le niveau 2 (Fondamentaux) contient ses deux chapitres et ses 7 leçons attendues", () => {
    const registry = scanContent(CONTENT_ROOT);
    const fondamentaux = registry.levels.find((l) => l.slug === "fondamentaux");
    expect(fondamentaux?.chapters).toHaveLength(2);
    expect(fondamentaux?.chapters.map((c) => c.meta.slug)).toEqual([
      "composition",
      "organisation",
    ]);
    const allLessons = fondamentaux?.chapters.flatMap((c) => c.lessons) ?? [];
    expect(allLessons).toHaveLength(7);
    expect(fondamentaux?.assessment).not.toBeNull();
  });
});

describe("scanFamousInteriors — contenu réel", () => {
  it("le contenu publié est valide", () => {
    expect(() => scanFamousInteriors(CONTENT_ROOT)).not.toThrow();
  });

  it("les 12 études d'intérieurs célèbres de docs/06 §4.2 sont publiées", () => {
    const items = scanFamousInteriors(CONTENT_ROOT).map((entry) => entry.frontmatter);
    expect(items).toHaveLength(12);
    expect(new Set(items.map((i) => i.order)).size).toBe(12);
  });
});

describe("scanMilestoneProjects — contenu réel", () => {
  it("le contenu publié est valide", () => {
    expect(() => scanMilestoneProjects(CONTENT_ROOT)).not.toThrow();
  });
});

describe("scanChallenges — contenu réel", () => {
  it("le contenu publié est valide", () => {
    expect(() => scanChallenges(CONTENT_ROOT)).not.toThrow();
  });
});

describe("scanLibrary — contenu réel", () => {
  it("le contenu publié est valide", () => {
    expect(() => scanLibrary(CONTENT_ROOT)).not.toThrow();
  });

  it("les relations déclarées sont bidirectionnellement cohérentes (docs/05 M7)", () => {
    const items = scanLibrary(CONTENT_ROOT).map((entry) => entry.frontmatter);
    expect(checkRelationSymmetry(items)).toEqual([]);
  });

  it("chaque catégorie a au moins une fiche publiée", () => {
    const items = scanLibrary(CONTENT_ROOT).map((entry) => entry.frontmatter);
    const categoriesPresent = new Set(items.map((i) => i.category));
    for (const category of LIB_CATEGORIES) {
      expect(categoriesPresent.has(category), `catégorie manquante : ${category}`).toBe(
        true,
      );
    }
  });
});
