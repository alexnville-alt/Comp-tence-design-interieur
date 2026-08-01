import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanContent } from "./registry";

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

  it("le niveau 1 contient le chapitre et les 4 leçons attendus", () => {
    const registry = scanContent(CONTENT_ROOT);
    const decouverte = registry.levels.find((l) => l.slug === "decouverte");
    expect(decouverte?.chapters).toHaveLength(1);
    expect(decouverte?.chapters[0]?.lessons).toHaveLength(4);
    expect(decouverte?.chapters[0]?.lessons.map((l) => l.frontmatter.slug)).toEqual([
      "quest-ce-qu-un-espace-reussi",
      "le-vocabulaire-de-base",
      "apprendre-a-observer",
      "les-dix-erreurs-qui-ruinent-une-piece",
    ]);
  });
});
