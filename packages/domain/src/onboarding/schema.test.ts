import { describe, expect, it } from "vitest";
import {
  GOAL_LABELS,
  GOALS,
  HOUSING_LABELS,
  HOUSING_TYPES,
  WEEKLY_PRESETS,
  onboardingSchema,
  profileSettingsSchema,
} from "./schema";

const validOnboarding = {
  goal: "WHOLE_HOME",
  housingType: "HOUSE",
  weeklyMinutes: 150,
  diagnosticAnswers: { q1: "b" },
};

describe("onboardingSchema", () => {
  it("accepte une saisie complète", () => {
    expect(onboardingSchema.parse(validOnboarding).goal).toBe("WHOLE_HOME");
  });

  it("accepte un diagnostic vide — il est facultatif", () => {
    const parsed = onboardingSchema.parse({
      ...validOnboarding,
      diagnosticAnswers: undefined,
    });
    expect(parsed.diagnosticAnswers).toEqual({});
  });

  it("rejette un objectif inconnu", () => {
    expect(
      onboardingSchema.safeParse({ ...validOnboarding, goal: "AUTRE" }).success,
    ).toBe(false);
  });

  it("rejette un type de logement inconnu", () => {
    expect(
      onboardingSchema.safeParse({ ...validOnboarding, housingType: "CHATEAU" }).success,
    ).toBe(false);
  });

  it("rejette un objectif hebdomadaire irréaliste", () => {
    expect(
      onboardingSchema.safeParse({ ...validOnboarding, weeklyMinutes: 5 }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...validOnboarding, weeklyMinutes: 5000 }).success,
    ).toBe(false);
  });

  it("rejette un objectif hebdomadaire non entier", () => {
    expect(
      onboardingSchema.safeParse({ ...validOnboarding, weeklyMinutes: 42.5 }).success,
    ).toBe(false);
  });

  it("rejette une réponse à une question de diagnostic inexistante", () => {
    // Empêche qu'un client modifié injecte des clés arbitraires en base.
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      diagnosticAnswers: { q99: "b" },
    });
    expect(result.success).toBe(false);
  });

  it("accepte toutes les valeurs de rythme proposées dans l'interface", () => {
    for (const preset of WEEKLY_PRESETS) {
      const result = onboardingSchema.safeParse({
        ...validOnboarding,
        weeklyMinutes: preset.minutes,
      });
      expect(result.success, `${preset.minutes} min`).toBe(true);
    }
  });
});

describe("profileSettingsSchema", () => {
  const validSettings = {
    theme: "SYSTEM",
    weeklyMinutes: 150,
    reducedMotion: false,
    soundEnabled: false,
  };

  it("accepte des préférences valides", () => {
    expect(profileSettingsSchema.parse(validSettings).theme).toBe("SYSTEM");
  });

  it("accepte un nom facultatif et le nettoie", () => {
    const parsed = profileSettingsSchema.parse({
      ...validSettings,
      name: "  Alex  ",
    });
    expect(parsed.name).toBe("Alex");
  });

  it("rejette un nom vide après nettoyage", () => {
    expect(
      profileSettingsSchema.safeParse({ ...validSettings, name: "   " }).success,
    ).toBe(false);
  });

  it("rejette un thème inconnu", () => {
    expect(
      profileSettingsSchema.safeParse({ ...validSettings, theme: "SEPIA" }).success,
    ).toBe(false);
  });
});

describe("libellés d'interface", () => {
  it("fournit un libellé pour chaque objectif et chaque logement", () => {
    // Un enum sans libellé afficherait une constante technique à l'utilisateur.
    for (const goal of GOALS) expect(GOAL_LABELS[goal]).toBeTruthy();
    for (const housing of HOUSING_TYPES) expect(HOUSING_LABELS[housing]).toBeTruthy();
  });

  it("propose des rythmes croissants avec une estimation de durée", () => {
    const minutes = WEEKLY_PRESETS.map((p) => p.minutes);
    expect([...minutes]).toEqual([...minutes].sort((a, b) => a - b));
    for (const preset of WEEKLY_PRESETS) expect(preset.hint).toBeTruthy();
  });
});
