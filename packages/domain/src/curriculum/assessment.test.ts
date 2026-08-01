import { describe, expect, it } from "vitest";
import {
  AssessmentFrontmatterSchema,
  computeAssessmentScore,
  hasPassedAssessment,
} from "./assessment";

const exercise = {
  slug: "exo-1",
  type: "QUIZ_TRUE_FALSE" as const,
  prompt: "Un point focal est toujours au centre de la pièce.",
  explanation: "Le point focal dépend de ce qu'on voit en premier, pas du centre.",
  statement: "Un point focal est toujours géométriquement centré.",
  correct: false,
};

describe("AssessmentFrontmatterSchema", () => {
  it("accepte une évaluation valide et applique passingScore par défaut", () => {
    const parsed = AssessmentFrontmatterSchema.parse({
      title: "Évaluation — Découverte",
      exercises: [exercise],
    });
    expect(parsed.passingScore).toBe(70);
  });

  it("rejette une évaluation sans exercice", () => {
    expect(
      AssessmentFrontmatterSchema.safeParse({ title: "Vide", exercises: [] }).success,
    ).toBe(false);
  });

  it("rejette deux exercices de même slug", () => {
    expect(
      AssessmentFrontmatterSchema.safeParse({
        title: "Doublon",
        exercises: [exercise, exercise],
      }).success,
    ).toBe(false);
  });

  it("rejette un passingScore hors de [0, 100]", () => {
    expect(
      AssessmentFrontmatterSchema.safeParse({
        title: "Seuil invalide",
        exercises: [exercise],
        passingScore: 150,
      }).success,
    ).toBe(false);
  });

  it("accepte un mélange des 7 types auto-corrigés et d'un cas ouvert (M5)", () => {
    const openCase = {
      slug: "cas-salon-nord",
      type: "OPEN_CASE" as const,
      prompt: "Proposez un aménagement pour ce salon.",
      scenario: "Un salon de 18 m², orienté nord.",
      constraint: "Budget mobilier ≤ 2000 €.",
      gradingNotes: "Attendre une réponse sur l'éclairage compensatoire.",
    };
    const parsed = AssessmentFrontmatterSchema.safeParse({
      title: "Évaluation mixte",
      exercises: [exercise, openCase],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("computeAssessmentScore", () => {
  it("calcule une moyenne pondérée par maxScore", () => {
    const score = computeAssessmentScore([
      { maxScore: 100, scoreRatio: 1 },
      { maxScore: 100, scoreRatio: 0 },
    ]);
    expect(score).toBe(50);
  });

  it("pondère un exercice qui vaut plus que les autres", () => {
    const score = computeAssessmentScore([
      { maxScore: 200, scoreRatio: 1 },
      { maxScore: 100, scoreRatio: 0 },
    ]);
    expect(score).toBe(67); // (200*1 + 100*0) / 300, arrondi
  });

  it("retourne 0 pour une liste vide plutôt qu'une division par zéro", () => {
    expect(computeAssessmentScore([])).toBe(0);
  });
});

describe("hasPassedAssessment", () => {
  it("réussi quand le score atteint exactement le seuil", () => {
    expect(hasPassedAssessment(70, 70)).toBe(true);
  });

  it("échoue en dessous du seuil", () => {
    expect(hasPassedAssessment(69, 70)).toBe(false);
  });
});
