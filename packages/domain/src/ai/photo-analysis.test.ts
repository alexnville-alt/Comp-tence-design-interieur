import { describe, expect, it } from "vitest";
import {
  AnalysePhotoSchema,
  NonPertinentePhotoSchema,
  PertinentePhotoAnalysisSchema,
} from "./photo-analysis";

const validAnalysis = {
  pertinente: true as const,
  styleDetecte: { principal: "Scandinave", confiance: 0.72 },
  proportions: {
    constat: "Le canapé occupe près de la moitié de la largeur utile.",
    problemes: ["Canapé surdimensionné pour la pièce"],
  },
  circulation: {
    constat: "Le passage entre la porte et la fenêtre est étroit.",
    obstacles: ["Table basse trop proche du canapé"],
  },
  lumiere: {
    constat: "Une seule source de lumière naturelle, orientée nord.",
    problemes: ["Aucun éclairage d'appoint visible le soir"],
  },
  problemes: [
    {
      numero: 1,
      titre: "Table basse trop proche",
      gravite: "moyen" as const,
      pourquoi: "Elle réduit le passage à moins de 60 cm, sous le minimum de confort.",
      repere: { x: 42, y: 61 },
    },
  ],
  ameliorations: [
    {
      action: "Rapprocher le canapé du mur du fond",
      pourquoiCaMarche: "Libère le passage central sans changer de mobilier.",
      effort: "immediat" as const,
      budget: "0-100" as const,
    },
    {
      action: "Ajouter un lampadaire d'appoint",
      pourquoiCaMarche: "Compense l'absence d'éclairage naturel en soirée.",
      effort: "immediat" as const,
      budget: "0-100" as const,
    },
    {
      action: "Remplacer la table basse par un modèle plus étroit",
      pourquoiCaMarche: "Restaure une largeur de passage confortable.",
      effort: "week-end" as const,
      budget: "100-500" as const,
    },
  ],
  critique:
    "Une base scandinave cohérente, pénalisée par un surdimensionnement du canapé.",
};

describe("PertinentePhotoAnalysisSchema", () => {
  it("valide une analyse complète", () => {
    expect(() => PertinentePhotoAnalysisSchema.parse(validAnalysis)).not.toThrow();
  });

  it("exige au moins trois améliorations", () => {
    expect(() =>
      PertinentePhotoAnalysisSchema.parse({
        ...validAnalysis,
        ameliorations: validAnalysis.ameliorations.slice(0, 2),
      }),
    ).toThrow();
  });

  it("exige un repère dans [0, 100] pour chaque problème", () => {
    expect(() =>
      PertinentePhotoAnalysisSchema.parse({
        ...validAnalysis,
        problemes: [{ ...validAnalysis.problemes[0], repere: { x: 142, y: 61 } }],
      }),
    ).toThrow();
  });

  it("exige une confiance de style entre 0 et 1", () => {
    expect(() =>
      PertinentePhotoAnalysisSchema.parse({
        ...validAnalysis,
        styleDetecte: { principal: "Scandinave", confiance: 1.5 },
      }),
    ).toThrow();
  });
});

describe("NonPertinentePhotoSchema", () => {
  it("valide un message de refus poli", () => {
    expect(() =>
      NonPertinentePhotoSchema.parse({
        pertinente: false,
        raison: "Cette photo semble être un paysage extérieur, pas une pièce à aménager.",
      }),
    ).not.toThrow();
  });

  it("rejette une raison vide", () => {
    expect(() =>
      NonPertinentePhotoSchema.parse({ pertinente: false, raison: "" }),
    ).toThrow();
  });
});

describe("AnalysePhotoSchema", () => {
  it("discrimine sur « pertinente » entre les deux formes", () => {
    expect(AnalysePhotoSchema.safeParse(validAnalysis).success).toBe(true);
    expect(
      AnalysePhotoSchema.safeParse({
        pertinente: false,
        raison: "Paysage, pas un intérieur.",
      }).success,
    ).toBe(true);
  });

  it("rejette pertinente: true sans les champs d'analyse complets", () => {
    expect(
      AnalysePhotoSchema.safeParse({
        pertinente: true,
        raison: "Cette forme appartient à la branche pertinente: false, pas ici.",
      }).success,
    ).toBe(false);
  });
});
