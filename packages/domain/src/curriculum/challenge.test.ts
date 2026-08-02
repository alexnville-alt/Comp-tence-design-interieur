import { describe, expect, it } from "vitest";
import { ChallengeFrontmatterSchema, toPublicChallenge } from "./challenge";

const valid = {
  slug: "transformer-une-entree",
  weekIndex: 1,
  title: "500 € pour transformer une entrée",
  scenario: "Une entrée d'appartement de 3 m², sombre, sans rangement.",
  constraint: "Budget total de 500 €, aucune modification structurelle.",
  gradingNotes: "Attendre un rangement vertical et une source de lumière d'appoint.",
};

describe("ChallengeFrontmatterSchema", () => {
  it("valide un défi complet", () => {
    expect(() => ChallengeFrontmatterSchema.parse(valid)).not.toThrow();
  });

  it("applique maxScore=100 par défaut", () => {
    expect(ChallengeFrontmatterSchema.parse(valid).maxScore).toBe(100);
  });

  it("rejette un weekIndex non positif", () => {
    expect(() => ChallengeFrontmatterSchema.parse({ ...valid, weekIndex: 0 })).toThrow();
  });

  it.each(["title", "scenario", "constraint", "gradingNotes"] as const)(
    "rejette un %s vide",
    (field) => {
      expect(() =>
        ChallengeFrontmatterSchema.parse({ ...valid, [field]: "  " }),
      ).toThrow();
    },
  );
});

describe("toPublicChallenge", () => {
  it("expose le scénario et la contrainte, jamais gradingNotes", () => {
    const parsed = ChallengeFrontmatterSchema.parse(valid);
    const pub = toPublicChallenge(parsed);
    expect(pub).toEqual({
      slug: valid.slug,
      weekIndex: valid.weekIndex,
      title: valid.title,
      scenario: valid.scenario,
      constraint: valid.constraint,
    });
    expect(pub).not.toHaveProperty("gradingNotes");
  });
});
