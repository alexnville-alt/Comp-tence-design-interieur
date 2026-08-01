import { describe, expect, it } from "vitest";
import {
  ChapterMetaSchema,
  LESSON_BLOCK_COMPONENTS,
  LessonFrontmatterSchema,
} from "./lesson-content.js";

const validFrontmatter = {
  slug: "quest-ce-qu-un-espace-reussi",
  number: 1,
  title: "Qu'est-ce qu'un espace réussi ?",
  summary: "Apprendre à regarder un espace et nommer ce qu'on y voit.",
  minutes: 7,
};

describe("LessonFrontmatterSchema", () => {
  it("accepte un frontmatter minimal et applique les valeurs par défaut", () => {
    const parsed = LessonFrontmatterSchema.parse(validFrontmatter);
    expect(parsed.xpReward).toBe(20);
    expect(parsed.published).toBe(true);
    expect(parsed.videoUrl).toBeUndefined();
  });

  it("rejette un slug avec des majuscules, espaces ou accents", () => {
    for (const slug of ["Quest-ce", "quest ce", "quest_ce", "quête-ce"]) {
      const result = LessonFrontmatterSchema.safeParse({ ...validFrontmatter, slug });
      expect(result.success, `slug "${slug}" devrait être rejeté`).toBe(false);
    }
  });

  it("accepte un slug composé de segments minuscules et de chiffres", () => {
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, slug: "niveau-1-lecon-2" })
        .success,
    ).toBe(true);
  });

  it("rejette un numéro de leçon nul, négatif ou non entier", () => {
    for (const number of [0, -1, 1.5]) {
      expect(
        LessonFrontmatterSchema.safeParse({ ...validFrontmatter, number }).success,
        `number ${number} devrait être rejeté`,
      ).toBe(false);
    }
  });

  it("rejette une durée nulle ou négative", () => {
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, minutes: 0 }).success,
    ).toBe(false);
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, minutes: -5 }).success,
    ).toBe(false);
  });

  it("rejette un titre ou un résumé vide, y compris après réduction des espaces", () => {
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, title: "   " }).success,
    ).toBe(false);
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, summary: "" }).success,
    ).toBe(false);
  });

  it("rejette une videoUrl qui n'est pas une URL", () => {
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, videoUrl: "pas-une-url" })
        .success,
    ).toBe(false);
  });

  it("accepte une videoUrl valide", () => {
    const parsed = LessonFrontmatterSchema.parse({
      ...validFrontmatter,
      videoUrl: "https://exemple.fr/video.mp4",
    });
    expect(parsed.videoUrl).toBe("https://exemple.fr/video.mp4");
  });

  it("accepte published explicitement à false", () => {
    expect(
      LessonFrontmatterSchema.parse({ ...validFrontmatter, published: false }).published,
    ).toBe(false);
  });

  it("rejette xpReward négatif", () => {
    expect(
      LessonFrontmatterSchema.safeParse({ ...validFrontmatter, xpReward: -10 }).success,
    ).toBe(false);
  });
});

describe("ChapterMetaSchema", () => {
  const validChapter = {
    number: 1,
    slug: "notions-generales",
    title: "Notions générales",
  };

  it("accepte une métadonnée de chapitre valide", () => {
    expect(ChapterMetaSchema.safeParse(validChapter).success).toBe(true);
  });

  it("rejette un numéro non positif", () => {
    expect(ChapterMetaSchema.safeParse({ ...validChapter, number: 0 }).success).toBe(
      false,
    );
  });

  it("rejette un slug invalide", () => {
    expect(
      ChapterMetaSchema.safeParse({ ...validChapter, slug: "Notions Générales" }).success,
    ).toBe(false);
  });

  it("rejette un titre vide", () => {
    expect(ChapterMetaSchema.safeParse({ ...validChapter, title: "" }).success).toBe(
      false,
    );
  });
});

describe("LESSON_BLOCK_COMPONENTS", () => {
  it("recense exactement les 11 types de blocs du curriculum (docs/06 §1.2)", () => {
    expect(LESSON_BLOCK_COMPONENTS).toHaveLength(11);
  });

  it("ne contient aucun doublon", () => {
    expect(new Set(LESSON_BLOCK_COMPONENTS).size).toBe(LESSON_BLOCK_COMPONENTS.length);
  });

  it("ne contient que des noms de composants MDX valides (PascalCase)", () => {
    for (const name of LESSON_BLOCK_COMPONENTS) {
      expect(name, name).toMatch(/^[A-Z][a-zA-Z]*$/);
    }
  });
});
