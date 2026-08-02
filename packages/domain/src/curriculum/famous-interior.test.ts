import { describe, expect, it } from "vitest";
import { FamousInteriorFrontmatterSchema } from "./famous-interior";

const valid = {
  slug: "villa-savoye",
  name: "Villa Savoye",
  architect: "Le Corbusier",
  year: "1931",
  location: "Poissy, France",
  context:
    "Résidence secondaire commandée par la famille Savoye, manifeste des cinq points de l'architecture moderne.",
  designIntent:
    "La maison comme « machine à habiter » : pilotis, plan libre, façade libre.",
  light: "Bandeau de fenêtres continu qui inonde chaque pièce d'une lumière égale.",
  materials: "Béton armé enduit blanc, aucune ornementation.",
  circulation:
    "Une rampe intérieure organise tout le parcours du rez-de-chaussée au toit-terrasse.",
  takeaways: ["Un plan libre facilite un usage qui change avec le temps."],
};

describe("FamousInteriorFrontmatterSchema", () => {
  it("valide une fiche complète", () => {
    expect(() => FamousInteriorFrontmatterSchema.parse(valid)).not.toThrow();
  });

  it("applique order=0 par défaut", () => {
    expect(FamousInteriorFrontmatterSchema.parse(valid).order).toBe(0);
  });

  it("rejette un tableau takeaways vide", () => {
    expect(() =>
      FamousInteriorFrontmatterSchema.parse({ ...valid, takeaways: [] }),
    ).toThrow();
  });

  it.each([
    "name",
    "architect",
    "year",
    "location",
    "context",
    "designIntent",
    "light",
    "materials",
    "circulation",
  ] as const)("rejette un %s vide", (field) => {
    expect(() =>
      FamousInteriorFrontmatterSchema.parse({ ...valid, [field]: "  " }),
    ).toThrow();
  });

  it("rejette un slug mal formé", () => {
    expect(() =>
      FamousInteriorFrontmatterSchema.parse({ ...valid, slug: "Villa Savoye" }),
    ).toThrow();
  });
});
