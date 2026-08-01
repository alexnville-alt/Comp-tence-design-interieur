import { z } from "zod";
import { DIAGNOSTIC_QUESTIONS } from "./diagnostic";

/**
 * Schémas partagés de l'onboarding.
 *
 * Le même schéma valide le formulaire côté client et la Server Action côté
 * serveur. Une seule définition, donc aucune dérive possible entre les deux —
 * et la validation serveur reste celle qui fait autorité, le client ne servant
 * qu'au confort de saisie.
 */

export const GOALS = ["WHOLE_HOME", "SINGLE_ROOM", "CAREER", "CURIOSITY"] as const;
export const HOUSING_TYPES = ["HOUSE", "APARTMENT", "STUDIO", "OTHER"] as const;

export const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  WHOLE_HOME: "Concevoir mon logement entier",
  SINGLE_ROOM: "Réaménager une pièce précise",
  CAREER: "Me reconvertir ou me professionnaliser",
  CURIOSITY: "Apprendre par curiosité",
};

export const HOUSING_LABELS: Record<(typeof HOUSING_TYPES)[number], string> = {
  HOUSE: "Une maison",
  APARTMENT: "Un appartement",
  STUDIO: "Un studio",
  OTHER: "Autre",
};

/**
 * Rythmes proposés. Le libellé annonce une durée d'atteinte réaliste :
 * afficher « 2 h/semaine » sans dire ce que cela implique laisse l'apprenant
 * choisir à l'aveugle, et une cible mal calibrée est la première cause
 * d'abandon d'un objectif hebdomadaire.
 */
export const WEEKLY_PRESETS = [
  { minutes: 60, label: "1 h par semaine", hint: "Tranquille — environ 12 mois" },
  { minutes: 150, label: "2 h 30 par semaine", hint: "Régulier — environ 5 mois" },
  { minutes: 300, label: "5 h par semaine", hint: "Soutenu — environ 3 mois" },
  { minutes: 600, label: "10 h par semaine", hint: "Intensif — environ 6 semaines" },
] as const;

const questionIds = DIAGNOSTIC_QUESTIONS.map((q) => q.id);

export const onboardingSchema = z.object({
  goal: z.enum(GOALS),
  housingType: z.enum(HOUSING_TYPES),
  weeklyMinutes: z
    .number()
    .int()
    .min(30, "Prévoyez au moins 30 minutes par semaine.")
    .max(2000, "Objectif irréaliste — 2 000 minutes correspondent à 33 h."),
  /** Réponses au diagnostic. Vide si l'apprenant a choisi de le passer. */
  diagnosticAnswers: z
    .record(z.string(), z.string())
    .refine((answers) => Object.keys(answers).every((id) => questionIds.includes(id)), {
      message: "Réponse à une question inconnue.",
    })
    .default({}),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSettingsSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  weeklyMinutes: z.number().int().min(30).max(2000),
  reducedMotion: z.boolean(),
  soundEnabled: z.boolean(),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
