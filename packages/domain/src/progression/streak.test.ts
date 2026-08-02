import { afterEach, describe, expect, it } from "vitest";
import {
  FREEZE_EVERY_DAYS,
  MAX_STREAK_FREEZES,
  recordDailyActivity,
  todayUtcDateString,
  type StreakState,
} from "./streak";

const EMPTY: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  streakFreezes: 1,
  lastActiveDate: null,
};

describe("recordDailyActivity", () => {
  it("démarre une série de 1 à la première activité", () => {
    const result = recordDailyActivity(EMPTY, "2026-08-01");
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      streakFreezes: 1,
      lastActiveDate: "2026-08-01",
    });
  });

  it("est idempotent : une deuxième activité le même jour ne change rien", () => {
    const day1 = recordDailyActivity(EMPTY, "2026-08-01");
    const again = recordDailyActivity(day1, "2026-08-01");
    expect(again).toEqual(day1);
  });

  it("incrémente la série sur un jour consécutif", () => {
    const day1 = recordDailyActivity(EMPTY, "2026-08-01");
    const day2 = recordDailyActivity(day1, "2026-08-02");
    expect(day2.currentStreak).toBe(2);
    expect(day2.longestStreak).toBe(2);
  });

  it("réinitialise la série à 1 après un jour manqué sans gel disponible", () => {
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      streakFreezes: 0,
      lastActiveDate: "2026-08-01",
    };
    const result = recordDailyActivity(state, "2026-08-03"); // un jour sauté
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(5); // le record n'est jamais effacé
  });

  it("absorbe un unique jour manqué avec un gel disponible, en le consommant", () => {
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      streakFreezes: 1,
      lastActiveDate: "2026-08-01",
    };
    const result = recordDailyActivity(state, "2026-08-03");
    expect(result.currentStreak).toBe(6);
    expect(result.streakFreezes).toBe(0);
  });

  it("réinitialise malgré un gel disponible si plus d'un jour est manqué", () => {
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      streakFreezes: 1,
      lastActiveDate: "2026-08-01",
    };
    const result = recordDailyActivity(state, "2026-08-05"); // trois jours sautés
    expect(result.currentStreak).toBe(1);
    expect(result.streakFreezes).toBe(1); // le gel non utilisé reste disponible
  });

  it("regagne un gel tous les FREEZE_EVERY_DAYS jours de série active, plafonné à MAX_STREAK_FREEZES", () => {
    let state: StreakState = {
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 0,
      lastActiveDate: null,
    };
    let date = new Date("2026-08-01T00:00:00.000Z");
    for (let i = 0; i < FREEZE_EVERY_DAYS; i++) {
      state = recordDailyActivity(state, todayUtcDateString(date));
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    }
    expect(state.currentStreak).toBe(FREEZE_EVERY_DAYS);
    expect(state.streakFreezes).toBe(1);
  });

  it("ne dépasse jamais MAX_STREAK_FREEZES", () => {
    const state: StreakState = {
      currentStreak: FREEZE_EVERY_DAYS * 2 - 1,
      longestStreak: FREEZE_EVERY_DAYS * 2 - 1,
      streakFreezes: MAX_STREAK_FREEZES,
      lastActiveDate: "2026-08-01",
    };
    const result = recordDailyActivity(state, "2026-08-02"); // atteint un multiple de FREEZE_EVERY_DAYS
    expect(result.streakFreezes).toBe(MAX_STREAK_FREEZES);
  });

  it("ignore une date antérieure à la dernière activité connue (horloge incohérente)", () => {
    const state: StreakState = {
      currentStreak: 3,
      longestStreak: 3,
      streakFreezes: 1,
      lastActiveDate: "2026-08-05",
    };
    expect(recordDailyActivity(state, "2026-08-01")).toEqual(state);
  });
});

describe("résistance au changement de fuseau horaire", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("produit exactement le même résultat quel que soit le fuseau du processus", () => {
    const scenarios: readonly (readonly [string, string])[] = [
      ["2026-08-01", "2026-08-02"],
      ["2026-08-01", "2026-08-03"],
      ["2026-12-31", "2027-01-01"], // frontière d'année, cas limite classique
    ];

    const timezones = ["UTC", "Pacific/Kiritimati", "Etc/GMT+12", "Asia/Kathmandu"];
    for (const [lastActive, today] of scenarios) {
      const results = timezones.map((tz) => {
        process.env.TZ = tz;
        return recordDailyActivity(
          {
            currentStreak: 1,
            longestStreak: 1,
            streakFreezes: 1,
            lastActiveDate: lastActive,
          },
          today,
        );
      });
      for (const result of results) {
        expect(result).toEqual(results[0]);
      }
    }
  });

  it("todayUtcDateString ne dépend que de l'instant UTC, jamais du fuseau du processus", () => {
    const instant = new Date("2026-08-01T23:30:00.000Z");
    const values = ["UTC", "Pacific/Kiritimati", "Etc/GMT+12"].map((tz) => {
      process.env.TZ = tz;
      return todayUtcDateString(instant);
    });
    expect(new Set(values).size).toBe(1);
    expect(values[0]).toBe("2026-08-01");
  });
});
