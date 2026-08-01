import { describe, expect, it } from "vitest";
import { FURNITURE_CATALOG, findCatalogEntry } from "./catalog";

describe("catalogue de mobilier", () => {
  it("a des slugs uniques", () => {
    const slugs = FURNITURE_CATALOG.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("retrouve une entrée par slug", () => {
    expect(findCatalogEntry("canape-3-places")?.label).toBe("Canapé 3 places");
  });

  it("retourne undefined pour un slug inconnu", () => {
    expect(findCatalogEntry("inconnu")).toBeUndefined();
  });
});
