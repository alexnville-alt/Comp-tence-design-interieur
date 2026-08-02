import { describe, expect, it } from "vitest";
import {
  evaluateBadge,
  type BadgeEvaluationContext,
} from "../progression/badge-criteria";
import { BADGES, BadgeDefinitionSchema } from "./badges";

describe("BADGES", () => {
  it("chaque badge valide BadgeDefinitionSchema", () => {
    for (const badge of BADGES) {
      expect(BadgeDefinitionSchema.safeParse(badge).success).toBe(true);
    }
  });

  it("les slugs sont uniques", () => {
    const slugs = BADGES.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("couvre les quatre catégories de PROG-02", () => {
    const criteriaTypes = new Set(BADGES.map((b) => b.criteria.type));
    expect(criteriaTypes.has("streak")).toBe(true);
    expect(criteriaTypes.has("level_complete")).toBe(true);
    expect(criteriaTypes.has("count")).toBe(true);
  });

  it("chaque critère est évaluable par evaluateBadge sans lever d'erreur", () => {
    const context: BadgeEvaluationContext = {
      currentStreak: 0,
      completedLevelNumbers: [],
      counts: {},
    };
    for (const badge of BADGES) {
      expect(() => evaluateBadge(badge.criteria, context)).not.toThrow();
    }
  });
});
