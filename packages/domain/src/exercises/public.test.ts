import { describe, expect, it } from "vitest";
import { toPublicExercise } from "./public";
import type { ExerciseFrontmatter } from "./schema";

const mcq: ExerciseFrontmatter = {
  type: "QUIZ_MCQ",
  slug: "mcq-1",
  prompt: "Question",
  explanation: "Explication",
  maxScore: 100,
  xpReward: 10,
  choices: ["A", "B"],
  correctIndices: [1],
};

const hotspot: ExerciseFrontmatter = {
  type: "HOTSPOT",
  slug: "hotspot-1",
  prompt: "Question",
  explanation: "Explication",
  maxScore: 100,
  xpReward: 10,
  imageLabel: "Salon",
  zones: [{ x: 10, y: 10, radius: 5, label: "canapé", correct: false }],
};

describe("toPublicExercise", () => {
  it("ne transmet ni l'explication ni le score de l'exercice", () => {
    const pub = toPublicExercise(mcq);
    expect(pub).not.toHaveProperty("explanation");
    expect(pub).not.toHaveProperty("maxScore");
  });

  it("QUIZ_MCQ — ne transmet pas correctIndices", () => {
    const pub = toPublicExercise(mcq);
    expect(pub).not.toHaveProperty("correctIndices");
    expect(pub).toEqual({
      type: "QUIZ_MCQ",
      slug: "mcq-1",
      prompt: "Question",
      choices: ["A", "B"],
    });
  });

  it("QUIZ_TRUE_FALSE — ne transmet pas correct", () => {
    const trueFalse: ExerciseFrontmatter = {
      type: "QUIZ_TRUE_FALSE",
      slug: "vf-1",
      prompt: "Question",
      explanation: "Explication",
      maxScore: 100,
      xpReward: 10,
      statement: "Un énoncé",
      correct: true,
    };
    expect(toPublicExercise(trueFalse)).not.toHaveProperty("correct");
  });

  it("HOTSPOT — les zones ne portent plus `correct`", () => {
    const pub = toPublicExercise(hotspot);
    expect(pub.type).toBe("HOTSPOT");
    if (pub.type === "HOTSPOT") {
      expect(pub.zones[0]).not.toHaveProperty("correct");
      expect(pub.zones[0]).toEqual({ x: 10, y: 10, radius: 5, label: "canapé" });
    }
  });

  it("MATERIAL_CHOICE — ne transmet pas correctIndex", () => {
    const materialChoice: ExerciseFrontmatter = {
      type: "MATERIAL_CHOICE",
      slug: "materiau-1",
      prompt: "Question",
      explanation: "Explication",
      maxScore: 100,
      xpReward: 10,
      scenario: "Scénario",
      options: [{ label: "Bois", description: "..." }],
      correctIndex: 0,
    };
    expect(toPublicExercise(materialChoice)).not.toHaveProperty("correctIndex");
  });

  it("QUIZ_MATCH — transmet les paires telles quelles", () => {
    const match: ExerciseFrontmatter = {
      type: "QUIZ_MATCH",
      slug: "match-1",
      prompt: "Question",
      explanation: "Explication",
      maxScore: 100,
      xpReward: 10,
      pairs: [{ left: "Volume", right: "Espace tridimensionnel" }],
    };
    expect(toPublicExercise(match)).toEqual({
      type: "QUIZ_MATCH",
      slug: "match-1",
      prompt: "Question",
      pairs: [{ left: "Volume", right: "Espace tridimensionnel" }],
    });
  });

  it("QUIZ_ORDER — transmet les éléments tels quels", () => {
    const order: ExerciseFrontmatter = {
      type: "QUIZ_ORDER",
      slug: "order-1",
      prompt: "Question",
      explanation: "Explication",
      maxScore: 100,
      xpReward: 10,
      items: ["Fonction", "Confort"],
    };
    expect(toPublicExercise(order)).toEqual({
      type: "QUIZ_ORDER",
      slug: "order-1",
      prompt: "Question",
      items: ["Fonction", "Confort"],
    });
  });

  it("PALETTE — ne transmet pas correctIndices", () => {
    const palette: ExerciseFrontmatter = {
      type: "PALETTE",
      slug: "palette-1",
      prompt: "Question",
      explanation: "Explication",
      maxScore: 100,
      xpReward: 10,
      brief: "Brief",
      options: [{ label: "Terracotta", hex: "#C1652F" }],
      correctIndices: [0],
    };
    expect(toPublicExercise(palette)).not.toHaveProperty("correctIndices");
  });
});
