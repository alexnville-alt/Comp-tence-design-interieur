import { describe, expect, it } from "vitest";
import { computeUserLevel, XP_AMOUNTS, xpForLevel } from "./xp";

describe("xpForLevel", () => {
  it("ne demande aucun XP pour le niveau 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("croît strictement avec le niveau", () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(3)).toBeGreaterThan(xpForLevel(2));
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(9));
  });
});

describe("computeUserLevel", () => {
  it("place un compte neuf (0 XP) au niveau 1, sans progression négative", () => {
    const result = computeUserLevel(0);
    expect(result.level).toBe(1);
    expect(result.xpIntoLevel).toBe(0);
    expect(result.progressRatio).toBe(0);
  });

  it("monte de niveau exactement au seuil, pas juste avant", () => {
    const threshold = xpForLevel(3);
    expect(computeUserLevel(threshold - 1).level).toBe(2);
    expect(computeUserLevel(threshold).level).toBe(3);
  });

  it("calcule la progression dans le niveau courant", () => {
    const result = computeUserLevel(xpForLevel(2) + 10);
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(10);
    expect(result.xpForNextLevel).toBe(xpForLevel(3) - xpForLevel(2));
  });

  it("ne renvoie jamais un ratio de progression NaN ou négatif", () => {
    for (const xp of [0, 1, 50, 1000, 1_000_000]) {
      const result = computeUserLevel(xp);
      expect(Number.isNaN(result.progressRatio)).toBe(false);
      expect(result.progressRatio).toBeGreaterThanOrEqual(0);
    }
  });

  it("traite un XP négatif comme zéro plutôt que de lever une erreur", () => {
    expect(computeUserLevel(-100)).toEqual(computeUserLevel(0));
  });

  it("expose des montants XP fixes positifs pour les raisons sans contenu associé", () => {
    for (const amount of Object.values(XP_AMOUNTS)) {
      expect(amount).toBeGreaterThan(0);
    }
  });
});
