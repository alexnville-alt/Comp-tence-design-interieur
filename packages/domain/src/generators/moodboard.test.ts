import { describe, expect, it } from "vitest";
import {
  buildMoodboardGenerationSchema,
  buildMoodboardSelectionSchema,
  type MoodboardCandidate,
} from "./moodboard";

const materialCandidates: MoodboardCandidate[] = [
  { slug: "chene-huile", name: "Chêne huilé", summary: "s" },
  { slug: "stratifie-hpl", name: "Stratifié HPL", summary: "s" },
];
const lightingCandidates: MoodboardCandidate[] = [
  { slug: "suspension-globe-laiton", name: "Suspension globe en laiton", summary: "s" },
];

describe("buildMoodboardSelectionSchema", () => {
  it("accepte un slug parmi les candidats de sa catégorie", () => {
    const schema = buildMoodboardSelectionSchema({ MATERIAL: materialCandidates });
    const result = schema.safeParse({
      MATERIAL: { slug: "chene-huile", justification: "Chaleureux et réparable." },
    });
    expect(result.success).toBe(true);
  });

  it("rejette un slug halluciné, absent des candidats fournis", () => {
    const schema = buildMoodboardSelectionSchema({ MATERIAL: materialCandidates });
    const result = schema.safeParse({
      MATERIAL: { slug: "marbre-inexistant", justification: "j" },
    });
    expect(result.success).toBe(false);
  });

  it("accepte null pour une catégorie sans recommandation pertinente", () => {
    const schema = buildMoodboardSelectionSchema({ MATERIAL: materialCandidates });
    const result = schema.safeParse({ MATERIAL: null });
    expect(result.success).toBe(true);
  });

  it("n'exige aucun champ pour une catégorie sans candidat", () => {
    const schema = buildMoodboardSelectionSchema({ MATERIAL: [] });
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("construit un champ indépendant par catégorie fournie", () => {
    const schema = buildMoodboardSelectionSchema({
      MATERIAL: materialCandidates,
      LIGHTING: lightingCandidates,
    });
    const result = schema.safeParse({
      MATERIAL: { slug: "stratifie-hpl", justification: "Économique." },
      LIGHTING: { slug: "suspension-globe-laiton", justification: "Douce et centrale." },
    });
    expect(result.success).toBe(true);
  });

  it("rejette un slug de matériau proposé dans le champ éclairage", () => {
    const schema = buildMoodboardSelectionSchema({
      MATERIAL: materialCandidates,
      LIGHTING: lightingCandidates,
    });
    const result = schema.safeParse({
      LIGHTING: { slug: "chene-huile", justification: "j" },
    });
    expect(result.success).toBe(false);
  });
});

describe("buildMoodboardGenerationSchema", () => {
  it("valide une génération complète (palette + sélections + synthèse)", () => {
    const schema = buildMoodboardGenerationSchema({ MATERIAL: materialCandidates });
    const result = schema.safeParse({
      palette: {
        colors: [
          { hex: "#336699", role: "dominante", justification: "j" },
          { hex: "#FFFFFF", role: "neutre", justification: "j" },
          { hex: "#112233", role: "accent", justification: "j" },
        ],
        synthese: "s",
      },
      selections: { MATERIAL: { slug: "chene-huile", justification: "j" } },
      synthese: "Ambiance chaleureuse et sobre.",
    });
    expect(result.success).toBe(true);
  });

  it("rejette une génération dont la palette est invalide", () => {
    const schema = buildMoodboardGenerationSchema({ MATERIAL: materialCandidates });
    const result = schema.safeParse({
      palette: { colors: [], synthese: "s" },
      selections: {},
      synthese: "s",
    });
    expect(result.success).toBe(false);
  });
});
