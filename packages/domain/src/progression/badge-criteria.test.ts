import { describe, expect, it } from "vitest";
import {
  BadgeCriteriaSchema,
  evaluateBadge,
  type BadgeEvaluationContext,
} from "./badge-criteria";

const CONTEXT: BadgeEvaluationContext = {
  currentStreak: 7,
  completedLevelNumbers: [1, 2],
  counts: { photo_analysis: 3, favorite_library: 10 },
};

describe("BadgeCriteriaSchema", () => {
  it("valide les trois formes", () => {
    expect(BadgeCriteriaSchema.safeParse({ type: "streak", days: 7 }).success).toBe(true);
    expect(
      BadgeCriteriaSchema.safeParse({ type: "level_complete", level: 1 }).success,
    ).toBe(true);
    expect(
      BadgeCriteriaSchema.safeParse({ type: "count", metric: "photo_analysis", gte: 3 })
        .success,
    ).toBe(true);
  });

  it("rejette un type inconnu", () => {
    expect(BadgeCriteriaSchema.safeParse({ type: "xp", amount: 100 }).success).toBe(
      false,
    );
  });

  it("rejette des valeurs non strictement positives", () => {
    expect(BadgeCriteriaSchema.safeParse({ type: "streak", days: 0 }).success).toBe(
      false,
    );
    expect(
      BadgeCriteriaSchema.safeParse({ type: "count", metric: "x", gte: -1 }).success,
    ).toBe(false);
  });
});

describe("evaluateBadge", () => {
  it("streak : atteint exactement le seuil", () => {
    expect(evaluateBadge({ type: "streak", days: 7 }, CONTEXT)).toBe(true);
    expect(evaluateBadge({ type: "streak", days: 8 }, CONTEXT)).toBe(false);
  });

  it("level_complete : présent ou absent de la liste des niveaux terminés", () => {
    expect(evaluateBadge({ type: "level_complete", level: 2 }, CONTEXT)).toBe(true);
    expect(evaluateBadge({ type: "level_complete", level: 3 }, CONTEXT)).toBe(false);
  });

  it("count : compare au compteur nommé, 0 si absent du contexte", () => {
    expect(
      evaluateBadge({ type: "count", metric: "photo_analysis", gte: 3 }, CONTEXT),
    ).toBe(true);
    expect(
      evaluateBadge({ type: "count", metric: "photo_analysis", gte: 4 }, CONTEXT),
    ).toBe(false);
    expect(evaluateBadge({ type: "count", metric: "inconnu", gte: 1 }, CONTEXT)).toBe(
      false,
    );
  });
});
