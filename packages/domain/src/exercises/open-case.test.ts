import { describe, expect, it } from "vitest";
import {
  GradingFeedbackSchema,
  OPEN_CASE_RUBRIC,
  OpenCaseFrontmatterSchema,
  gradingResultFromFeedback,
  toPublicOpenCase,
  type OpenCaseFrontmatter,
} from "./open-case";

const validFrontmatter = {
  slug: "salon-nord-etroit",
  type: "OPEN_CASE" as const,
  prompt: "Proposez un aménagement pour ce salon.",
  scenario: "Un salon de 18 m², orienté nord, avec une seule fenêtre en façade.",
  constraint: "Le budget mobilier ne doit pas dépasser 2000 €.",
  gradingNotes:
    "Attendre une réponse sur l'éclairage compensatoire et le choix de teintes claires.",
};

describe("OpenCaseFrontmatterSchema", () => {
  it("valide un frontmatter complet", () => {
    expect(() => OpenCaseFrontmatterSchema.parse(validFrontmatter)).not.toThrow();
  });

  it.each(["prompt", "scenario", "constraint", "gradingNotes"] as const)(
    "rejette un %s vide",
    (field) => {
      expect(() =>
        OpenCaseFrontmatterSchema.parse({ ...validFrontmatter, [field]: "  " }),
      ).toThrow();
    },
  );

  it("applique les valeurs par défaut de maxScore et xpReward", () => {
    const result = OpenCaseFrontmatterSchema.parse(validFrontmatter);
    expect(result.maxScore).toBe(100);
    expect(result.xpReward).toBe(10);
  });

  it("rejette un slug mal formé", () => {
    expect(() =>
      OpenCaseFrontmatterSchema.parse({ ...validFrontmatter, slug: "Salon Nord" }),
    ).toThrow();
  });
});

describe("OPEN_CASE_RUBRIC", () => {
  it("comporte les 5 critères de docs/06 §1.3", () => {
    expect(OPEN_CASE_RUBRIC).toHaveLength(5);
  });

  it("somme à 1 (100 %)", () => {
    const total = OPEN_CASE_RUBRIC.reduce((sum, item) => sum + item.poids, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("toPublicOpenCase", () => {
  it("expose prompt, scenario, contrainte et barème", () => {
    const exercise = OpenCaseFrontmatterSchema.parse(validFrontmatter);
    const publicExercise = toPublicOpenCase(exercise);
    expect(publicExercise).toEqual({
      type: "OPEN_CASE",
      slug: exercise.slug,
      prompt: exercise.prompt,
      scenario: exercise.scenario,
      constraint: exercise.constraint,
      rubric: OPEN_CASE_RUBRIC,
    });
  });

  it("ne renvoie jamais gradingNotes", () => {
    const exercise = OpenCaseFrontmatterSchema.parse(validFrontmatter);
    const publicExercise = toPublicOpenCase(exercise) as unknown as Record<
      string,
      unknown
    >;
    expect(publicExercise.gradingNotes).toBeUndefined();
  });
});

describe("GradingFeedbackSchema", () => {
  const validFeedback = {
    scoreRatio: 0.82,
    pointsForts: ["Bonne exploitation de la lumière indirecte.", "Palette cohérente."],
    axesAmelioration: [
      "Le budget dépasse légèrement la contrainte annoncée.",
      "Aucune justification technique sur le choix des matières.",
    ],
    regleAReviser: "Compenser une orientation nord par un éclairage à IRC élevé.",
  };

  it("valide un retour de correction complet", () => {
    expect(() => GradingFeedbackSchema.parse(validFeedback)).not.toThrow();
  });

  it.each([-0.1, 1.1])("rejette un scoreRatio hors de [0, 1] (%s)", (scoreRatio) => {
    expect(() => GradingFeedbackSchema.parse({ ...validFeedback, scoreRatio })).toThrow();
  });

  it.each(["pointsForts", "axesAmelioration"] as const)(
    "exige exactement deux éléments dans %s",
    (field) => {
      expect(() =>
        GradingFeedbackSchema.parse({ ...validFeedback, [field]: ["un seul point"] }),
      ).toThrow();
      expect(() =>
        GradingFeedbackSchema.parse({ ...validFeedback, [field]: ["a", "b", "c"] }),
      ).toThrow();
    },
  );

  it("rejette une règle à réviser vide", () => {
    expect(() =>
      GradingFeedbackSchema.parse({ ...validFeedback, regleAReviser: "" }),
    ).toThrow();
  });
});

describe("gradingResultFromFeedback", () => {
  it.each([
    [0.7, true],
    [0.71, true],
    [1, true],
    [0.69, false],
    [0, false],
  ])("scoreRatio %s → correct = %s", (scoreRatio, correct) => {
    const result = gradingResultFromFeedback({
      scoreRatio,
      pointsForts: ["a", "b"],
      axesAmelioration: ["c", "d"],
      regleAReviser: "e",
    });
    expect(result).toEqual({ scoreRatio, correct });
  });
});

describe("cohérence de type", () => {
  it("le littéral « OPEN_CASE » infère correctement le type discriminant", () => {
    const exercise: OpenCaseFrontmatter =
      OpenCaseFrontmatterSchema.parse(validFrontmatter);
    expect(exercise.type).toBe("OPEN_CASE");
  });
});
