import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalysePhoto } from "@atelier/domain";
import { PhotoAnalysisView } from "./analysis-view";

/**
 * Composant purement présentationnel : ces tests couvrent les deux formes de
 * `AnalysePhoto` (pertinente / non pertinente) sans dépendre de quel côté de
 * l'union discriminée l'adaptateur IA (réel ou factice) choisit — voir
 * `packages/ai/src/adapters/fake-schema.ts` pour pourquoi l'ordre des
 * branches n'est pas garanti observable par ailleurs.
 */

const pertinenteResult: AnalysePhoto = {
  pertinente: true,
  styleDetecte: { principal: "Scandinave", confiance: 0.8 },
  proportions: { constat: "Canapé surdimensionné.", problemes: ["Canapé trop grand"] },
  circulation: { constat: "Passage étroit.", obstacles: ["Table basse"] },
  lumiere: { constat: "Une seule fenêtre.", problemes: ["Pas d'éclairage d'appoint"] },
  problemes: [
    {
      numero: 1,
      titre: "Table basse trop proche",
      gravite: "moyen",
      pourquoi: "Réduit le passage à moins de 60 cm.",
      repere: { x: 42, y: 61 },
    },
  ],
  ameliorations: [
    {
      action: "Rapprocher le canapé du mur",
      pourquoiCaMarche: "Libère le passage.",
      effort: "immediat",
      budget: "0-100",
    },
    {
      action: "Ajouter un lampadaire",
      pourquoiCaMarche: "Compense le manque de lumière.",
      effort: "immediat",
      budget: "0-100",
    },
    {
      action: "Remplacer la table basse",
      pourquoiCaMarche: "Restaure une largeur de passage confortable.",
      effort: "week-end",
      budget: "100-500",
    },
  ],
  critique: "Une base cohérente, pénalisée par un surdimensionnement.",
};

const nonPertinenteResult: AnalysePhoto = {
  pertinente: false,
  raison: "Cette photo semble être un paysage extérieur, pas une pièce à aménager.",
};

describe("PhotoAnalysisView", () => {
  it("affiche l'analyse complète, les repères numérotés et le lien vers l'atelier", () => {
    render(
      <PhotoAnalysisView
        result={pertinenteResult}
        readUrl="https://exemple.test/photo.jpg"
        openInAtelierHref="/atelier/projet-1/piece-1"
      />,
    );

    expect(screen.getByText("Scandinave")).toBeInTheDocument();
    expect(screen.getByText(/Table basse trop proche/)).toBeInTheDocument();
    expect(screen.getByText(/Réduit le passage à moins de 60 cm/)).toBeInTheDocument();
    expect(screen.getAllByText(/Rapprocher le canapé du mur/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Une base cohérente/)).toBeInTheDocument();

    const marker = screen.getByRole("link", {
      name: "Voir le problème 1 : Table basse trop proche",
    });
    expect(marker).toHaveAttribute("href", "#probleme-1");

    expect(screen.getByRole("link", { name: "Ouvrir dans l'atelier" })).toHaveAttribute(
      "href",
      "/atelier/projet-1/piece-1",
    );
  });

  it("n'affiche pas la passerelle atelier quand la pièce n'est plus rattachable", () => {
    render(
      <PhotoAnalysisView
        result={pertinenteResult}
        readUrl="https://exemple.test/photo.jpg"
        openInAtelierHref={null}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "Ouvrir dans l'atelier" }),
    ).not.toBeInTheDocument();
  });

  it("affiche le message de refus poli pour une photo non pertinente, sans inventer d'analyse", () => {
    render(
      <PhotoAnalysisView
        result={nonPertinenteResult}
        readUrl="https://exemple.test/photo.jpg"
        openInAtelierHref="/atelier/projet-1/piece-1"
      />,
    );

    expect(screen.getByText(/paysage extérieur/)).toBeInTheDocument();
    expect(screen.queryByText(/Problèmes repérés/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Améliorations proposées/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ouvrir dans l'atelier" }),
    ).not.toBeInTheDocument();
  });
});
