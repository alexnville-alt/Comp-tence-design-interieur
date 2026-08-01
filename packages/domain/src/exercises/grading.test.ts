import { describe, expect, it } from "vitest";
import { gradeExercise } from "./grading";
import {
  ExerciseFrontmatterSchema,
  type ExerciseFrontmatter,
  validateExerciseIntegrity,
} from "./schema";

const mcq: ExerciseFrontmatter = {
  type: "QUIZ_MCQ",
  slug: "mcq-1",
  prompt: "Quelle distance minimale pour un passage principal ?",
  explanation: "90 cm est le minimum utilisable au quotidien.",
  maxScore: 100,
  xpReward: 10,
  choices: ["60 cm", "90 cm", "120 cm"],
  correctIndices: [1],
};

const trueFalse: ExerciseFrontmatter = {
  type: "QUIZ_TRUE_FALSE",
  slug: "vf-1",
  prompt: "Une pièce peut avoir plusieurs points focaux.",
  explanation: "Un seul point focal évite la concurrence visuelle.",
  maxScore: 100,
  xpReward: 10,
  statement: "Un salon doit toujours avoir trois points focaux.",
  correct: false,
};

const match: ExerciseFrontmatter = {
  type: "QUIZ_MATCH",
  slug: "match-1",
  prompt: "Associez chaque terme à sa définition.",
  explanation: "Voir la leçon sur le vocabulaire de base.",
  maxScore: 100,
  xpReward: 10,
  pairs: [
    { left: "Volume", right: "Espace tridimensionnel de la pièce" },
    { left: "Circulation", right: "Trajets empruntés pour se déplacer" },
    { left: "Point focal", right: "Premier élément que l'œil rencontre" },
  ],
};

const order: ExerciseFrontmatter = {
  type: "QUIZ_ORDER",
  slug: "order-1",
  prompt: "Remettez les 4 critères d'un espace réussi dans l'ordre.",
  explanation: "Fonction, confort, cohérence, identité.",
  maxScore: 100,
  xpReward: 10,
  items: ["Fonction", "Confort", "Cohérence", "Identité"],
};

const hotspot: ExerciseFrontmatter = {
  type: "HOTSPOT",
  slug: "hotspot-1",
  prompt: "Cliquez sur le point focal de ce salon.",
  explanation: "La cheminée capte le regard en premier.",
  maxScore: 100,
  xpReward: 10,
  imageLabel: "Salon avec cheminée",
  zones: [
    { x: 10, y: 10, radius: 5, label: "canapé", correct: false },
    { x: 50, y: 20, radius: 8, label: "cheminée", correct: true },
  ],
};

const palette: ExerciseFrontmatter = {
  type: "PALETTE",
  slug: "palette-1",
  prompt: "Choisissez les deux teintes qui complètent cette palette neutre.",
  explanation: "Les tons terreux prolongent la palette existante.",
  maxScore: 100,
  xpReward: 10,
  brief: "Palette neutre chaude, un salon lumineux plein sud.",
  options: [
    { label: "Terracotta", hex: "#C1652F" },
    { label: "Bleu vif", hex: "#0047FF" },
    { label: "Sable", hex: "#D8C3A5" },
  ],
  correctIndices: [0, 2],
};

const materialChoice: ExerciseFrontmatter = {
  type: "MATERIAL_CHOICE",
  slug: "materiau-1",
  prompt: "Quel matériau pour un plan de travail très sollicité ?",
  explanation: "Le quartz résiste aux taches et rayures du quotidien.",
  maxScore: 100,
  xpReward: 10,
  scenario: "Cuisine familiale utilisée tous les jours.",
  options: [
    { label: "Quartz", description: "Résistant, peu d'entretien." },
    { label: "Bois brut non traité", description: "Se tache et se raye facilement." },
  ],
  correctIndex: 0,
};

describe("ExerciseFrontmatterSchema", () => {
  it.each([
    ["QUIZ_MCQ", mcq],
    ["QUIZ_TRUE_FALSE", trueFalse],
    ["QUIZ_MATCH", match],
    ["QUIZ_ORDER", order],
    ["HOTSPOT", hotspot],
    ["PALETTE", palette],
    ["MATERIAL_CHOICE", materialChoice],
  ])("valide un exercice %s bien formé", (_name, exercise) => {
    expect(ExerciseFrontmatterSchema.safeParse(exercise).success).toBe(true);
    expect(validateExerciseIntegrity(exercise)).toBeNull();
  });

  it("rejette un type inconnu", () => {
    expect(ExerciseFrontmatterSchema.safeParse({ ...mcq, type: "ESSAY" }).success).toBe(
      false,
    );
  });

  it("rejette un QUIZ_MCQ avec un seul choix", () => {
    expect(
      ExerciseFrontmatterSchema.safeParse({ ...mcq, choices: ["seul"] }).success,
    ).toBe(false);
  });
});

describe("validateExerciseIntegrity", () => {
  it("détecte un correctIndices hors bornes (MCQ)", () => {
    const broken = { ...mcq, correctIndices: [5] };
    expect(validateExerciseIntegrity(broken)).toMatch(/choix inexistant/);
  });

  it("détecte un correctIndices hors bornes (PALETTE)", () => {
    const broken = { ...palette, correctIndices: [9] };
    expect(validateExerciseIntegrity(broken)).toMatch(/option inexistante/);
  });

  it("détecte un correctIndex hors bornes (MATERIAL_CHOICE)", () => {
    const broken = { ...materialChoice, correctIndex: 9 };
    expect(validateExerciseIntegrity(broken)).toMatch(/option inexistante/);
  });

  it("détecte un HOTSPOT sans aucune zone correcte", () => {
    const broken = {
      ...hotspot,
      zones: hotspot.zones.map((z) => ({ ...z, correct: false })),
    };
    expect(validateExerciseIntegrity(broken)).toMatch(/au moins une zone/);
  });
});

describe("gradeExercise", () => {
  it("QUIZ_MCQ — bonne réponse unique", () => {
    expect(gradeExercise(mcq, { selectedIndices: [1] })).toEqual({
      scoreRatio: 1,
      correct: true,
    });
  });

  it("QUIZ_MCQ — mauvaise réponse", () => {
    expect(gradeExercise(mcq, { selectedIndices: [0] })).toEqual({
      scoreRatio: 0,
      correct: false,
    });
  });

  it("QUIZ_MCQ — plusieurs bonnes réponses, ordre indifférent", () => {
    const multi = { ...mcq, correctIndices: [0, 2] };
    expect(gradeExercise(multi, { selectedIndices: [2, 0] }).correct).toBe(true);
    expect(gradeExercise(multi, { selectedIndices: [0] }).correct).toBe(false);
  });

  it("QUIZ_TRUE_FALSE", () => {
    expect(gradeExercise(trueFalse, { value: false })).toEqual({
      scoreRatio: 1,
      correct: true,
    });
    expect(gradeExercise(trueFalse, { value: true })).toEqual({
      scoreRatio: 0,
      correct: false,
    });
  });

  it("QUIZ_MATCH — score proportionnel", () => {
    expect(gradeExercise(match, { assignments: [0, 1, 2] })).toEqual({
      scoreRatio: 1,
      correct: true,
    });
    const partial = gradeExercise(match, { assignments: [0, 2, 1] });
    expect(partial.scoreRatio).toBeCloseTo(1 / 3);
    expect(partial.correct).toBe(false);
  });

  it("QUIZ_ORDER — score proportionnel aux positions correctes", () => {
    expect(gradeExercise(order, { order: [0, 1, 2, 3] }).correct).toBe(true);
    const partial = gradeExercise(order, { order: [1, 0, 2, 3] });
    expect(partial.scoreRatio).toBeCloseTo(0.5);
    expect(partial.correct).toBe(false);
  });

  it("HOTSPOT — pénalise les zones incorrectes sélectionnées", () => {
    expect(gradeExercise(hotspot, { selectedIndices: [1] })).toEqual({
      scoreRatio: 1,
      correct: true,
    });
    const wrongPlusRight = gradeExercise(hotspot, { selectedIndices: [0, 1] });
    expect(wrongPlusRight.scoreRatio).toBe(0);
    expect(wrongPlusRight.correct).toBe(false);
  });

  it("HOTSPOT — le score ne descend jamais sous zéro", () => {
    const manyWrong = {
      ...hotspot,
      zones: [
        ...hotspot.zones,
        { x: 80, y: 80, radius: 5, label: "tapis", correct: false },
        { x: 90, y: 90, radius: 5, label: "lampe", correct: false },
      ],
    };
    const result = gradeExercise(manyWrong, { selectedIndices: [0, 2, 3] });
    expect(result.scoreRatio).toBe(0);
  });

  it("PALETTE — ensemble exact requis", () => {
    expect(gradeExercise(palette, { selectedIndices: [0, 2] }).correct).toBe(true);
    expect(gradeExercise(palette, { selectedIndices: [0] }).correct).toBe(false);
    expect(gradeExercise(palette, { selectedIndices: [0, 1, 2] }).correct).toBe(false);
  });

  it("MATERIAL_CHOICE", () => {
    expect(gradeExercise(materialChoice, { selectedIndex: 0 }).correct).toBe(true);
    expect(gradeExercise(materialChoice, { selectedIndex: 1 }).correct).toBe(false);
  });

  it("rejette une réponse mal formée", () => {
    expect(() => gradeExercise(mcq, { selectedIndices: "1" })).toThrow();
    expect(() => gradeExercise(trueFalse, {})).toThrow();
  });
});
