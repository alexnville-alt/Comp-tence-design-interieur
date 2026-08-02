import { describe, expect, it } from "vitest";
import { MilestoneProjectFrontmatterSchema } from "./milestone-project";

const valid = {
  slug: "reamenager-une-piece-simple",
  phase: 1,
  title: "Réaménager une pièce simple sur plan",
  brief:
    "Choisissez une pièce de votre logement et réaménagez-la entièrement dans l'atelier.",
  deliverables: ["Un plan coté de la pièce", "Une palette de couleurs justifiée"],
  evaluationCriteria: [
    "La circulation respecte les distances minimales vues en niveau 2",
  ],
};

describe("MilestoneProjectFrontmatterSchema", () => {
  it("valide un brief complet", () => {
    expect(() => MilestoneProjectFrontmatterSchema.parse(valid)).not.toThrow();
  });

  it.each([0, 5] as const)("rejette une phase hors de 1 à 4 (%i)", (phase) => {
    expect(() => MilestoneProjectFrontmatterSchema.parse({ ...valid, phase })).toThrow();
  });

  it("rejette des livrables vides", () => {
    expect(() =>
      MilestoneProjectFrontmatterSchema.parse({ ...valid, deliverables: [] }),
    ).toThrow();
  });

  it("rejette des critères d'évaluation vides", () => {
    expect(() =>
      MilestoneProjectFrontmatterSchema.parse({ ...valid, evaluationCriteria: [] }),
    ).toThrow();
  });
});
