import { describe, expect, it } from "vitest";
import {
  LEVELS,
  PHASES,
  TOTAL_ESTIMATED_MINUTES,
  getLevel,
  isLevelUnlocked,
  levelsOfPhase,
} from "./levels";

describe("structure du curriculum", () => {
  it("comporte 15 niveaux numérotés de 1 à 15 sans trou", () => {
    expect(LEVELS).toHaveLength(15);
    expect(LEVELS.map((l) => l.number)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
  });

  it("n'a aucun slug en double", () => {
    const slugs = LEVELS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("répartit tous les niveaux dans les 4 phases", () => {
    const covered = PHASES.flatMap((phase) => levelsOfPhase(phase.number));
    expect(covered).toHaveLength(LEVELS.length);
  });

  it("ne référence jamais un prérequis inexistant ou postérieur", () => {
    for (const level of LEVELS) {
      if (level.requiresLevel === null) continue;
      expect(getLevel(level.requiresLevel), `niveau ${level.number}`).toBeDefined();
      // Un prérequis postérieur rendrait le niveau définitivement inaccessible.
      expect(level.requiresLevel).toBeLessThan(level.number);
    }
  });

  it("laisse le niveau 1 accessible sans prérequis", () => {
    expect(getLevel(1)?.requiresLevel).toBeNull();
  });

  it("annonce une durée totale cohérente avec le curriculum (~50 h)", () => {
    const hours = TOTAL_ESTIMATED_MINUTES / 60;
    expect(hours).toBeGreaterThan(45);
    expect(hours).toBeLessThan(55);
  });
});

describe("isLevelUnlocked", () => {
  it("ouvre le niveau 1 à un nouvel apprenant", () => {
    expect(isLevelUnlocked(1, [])).toBe(true);
  });

  it("verrouille un niveau dont le prérequis n'est pas terminé", () => {
    expect(isLevelUnlocked(2, [])).toBe(false);
  });

  it("ouvre un niveau dès son prérequis terminé", () => {
    expect(isLevelUnlocked(2, [1])).toBe(true);
  });

  it("ouvre tous les niveaux jusqu'au niveau de départ du diagnostic", () => {
    // Un apprenant positionné au niveau 3 ne doit pas avoir à valider les
    // niveaux 1 et 2 pour commencer.
    expect(isLevelUnlocked(3, [], 3)).toBe(true);
    expect(isLevelUnlocked(2, [], 3)).toBe(true);
    // …mais le niveau 4 reste conditionné à la validation du niveau 3.
    expect(isLevelUnlocked(4, [], 3)).toBe(false);
    expect(isLevelUnlocked(4, [3], 3)).toBe(true);
  });

  it("ouvre les six niveaux de la phase 3 dès le niveau 6 terminé", () => {
    // Les pièces (7 à 12) sont volontairement parallèles : rien n'impose
    // d'apprendre la cuisine avant la chambre.
    for (const n of [7, 8, 9, 10, 11, 12]) {
      expect(isLevelUnlocked(n, [6]), `niveau ${n}`).toBe(true);
    }
  });

  it("refuse un numéro de niveau inexistant", () => {
    expect(isLevelUnlocked(99, [1, 2, 3])).toBe(false);
    expect(isLevelUnlocked(0, [])).toBe(false);
  });
});
