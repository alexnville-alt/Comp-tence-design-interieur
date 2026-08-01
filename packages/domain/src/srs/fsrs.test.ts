import { default_w } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { initCardState, isDue, scheduleReview } from "./fsrs";

const NOW = new Date("2026-08-01T00:00:00.000Z");

describe("initCardState", () => {
  it("crée une carte neuve, due immédiatement", () => {
    const state = initCardState(NOW);
    expect(state.state).toBe("NEW");
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.lastReviewAt).toBeNull();
    expect(isDue(state, NOW)).toBe(true);
  });
});

describe("scheduleReview — reproduit les paramètres de référence FSRS-6", () => {
  // La stabilité initiale d'une carte neuve est le poids w_{G-1} de
  // l'algorithme (FSRSAlgorithm.init_stability) — vérifié directement contre
  // les poids par défaut exportés par ts-fsrs, pas une valeur recopiée à la
  // main qui pourrait dériver silencieusement d'une mise à jour de paquet.
  it.each([
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 3],
  ] as const)("note %i → stabilité initiale = w[%i]", (rating, weightIndex) => {
    const next = scheduleReview(initCardState(NOW), rating, NOW);
    expect(next.stability).toBeCloseTo(default_w[weightIndex]!, 10);
  });

  it("une carte neuve passe en révision dès la première note, quelle qu'elle soit", () => {
    for (const rating of [1, 2, 3, 4] as const) {
      const next = scheduleReview(initCardState(NOW), rating, NOW);
      expect(next.state).toBe("REVIEW");
      expect(next.reps).toBe(1);
    }
  });

  it("une meilleure note produit une échéance plus lointaine", () => {
    const due = ([1, 2, 3, 4] as const).map((rating) =>
      scheduleReview(initCardState(NOW), rating, NOW).dueAt.getTime(),
    );
    expect(due[0]).toBeLessThan(due[1]!);
    expect(due[1]).toBeLessThan(due[2]!);
    expect(due[2]).toBeLessThan(due[3]!);
  });

  it("des révisions « Correct » répétées augmentent la stabilité (moins de révisions, meilleure rétention)", () => {
    let state = initCardState(NOW);
    let now = NOW;
    const stabilities: number[] = [];
    for (let i = 0; i < 4; i++) {
      state = scheduleReview(state, 3, now);
      stabilities.push(state.stability);
      now = state.dueAt;
    }
    for (let i = 1; i < stabilities.length; i++) {
      expect(stabilities[i]).toBeGreaterThan(stabilities[i - 1]!);
    }
  });

  it("un échec en révision incrémente les lapses et rapproche la prochaine échéance", () => {
    const afterGood = scheduleReview(initCardState(NOW), 3, NOW);
    const afterAgain = scheduleReview(afterGood, 1, afterGood.dueAt);

    expect(afterAgain.lapses).toBe(1);
    expect(afterAgain.reps).toBe(2);
    const intervalAfterGood = afterGood.dueAt.getTime() - NOW.getTime();
    const intervalAfterAgain = afterAgain.dueAt.getTime() - afterGood.dueAt.getTime();
    expect(intervalAfterAgain).toBeLessThan(intervalAfterGood);
  });
});

describe("isDue", () => {
  it("une carte est due quand son échéance n'est pas dans le futur", () => {
    const state = initCardState(NOW);
    const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    expect(isDue(state, NOW)).toBe(true);
    expect(isDue(state, tomorrow)).toBe(true);

    const reviewed = scheduleReview(state, 3, NOW);
    expect(isDue(reviewed, NOW)).toBe(false);
    expect(isDue(reviewed, reviewed.dueAt)).toBe(true);
  });
});
