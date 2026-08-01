import { describe, expect, it } from "vitest";
import { formatAttributeEntries, formatAttributeValue } from "./attribute-format";

describe("formatAttributeValue", () => {
  it("formate un booléen en Oui/Non", () => {
    expect(formatAttributeValue(true)).toBe("Oui");
    expect(formatAttributeValue(false)).toBe("Non");
  });

  it("formate un nombre et une chaîne tels quels", () => {
    expect(formatAttributeValue(1360)).toBe("1360");
    expect(formatAttributeValue("medium")).toBe("medium");
  });

  it("formate un tableau en liste séparée par des virgules", () => {
    expect(formatAttributeValue(["fine", "medium"])).toBe("fine, medium");
  });

  it("formate un objet imbriqué en paires clé/valeur", () => {
    expect(formatAttributeValue({ w: 90, d: 90, h: 35 })).toBe(
      "W : 90 · D : 90 · H : 35",
    );
  });

  it("formate null/undefined en tiret", () => {
    expect(formatAttributeValue(null)).toBe("—");
    expect(formatAttributeValue(undefined)).toBe("—");
  });
});

describe("formatAttributeEntries", () => {
  it("convertit chaque clé en libellé lisible", () => {
    const entries = formatAttributeEntries({ jankaHardness: 1360, grain: "medium" });
    expect(entries).toEqual([
      { key: "jankaHardness", label: "Janka hardness", value: "1360" },
      { key: "grain", label: "Grain", value: "medium" },
    ]);
  });
});
