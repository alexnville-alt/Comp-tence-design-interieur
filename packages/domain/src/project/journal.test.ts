import { describe, expect, it } from "vitest";
import { JOURNAL_KINDS, JOURNAL_KIND_LABELS, JournalEntryInputSchema } from "./journal";

describe("JournalEntryInputSchema", () => {
  it("accepte une entrée valide", () => {
    const result = JournalEntryInputSchema.safeParse({
      title: "Budget cuisine",
      body: "Enveloppe fixée à 8000 €, hors électroménager.",
      kind: "BUDGET",
    });
    expect(result.success).toBe(true);
  });

  it("applique NOTE par défaut si kind est omis", () => {
    const result = JournalEntryInputSchema.parse({
      title: "Idée",
      body: "Peindre en vert.",
    });
    expect(result.kind).toBe("NOTE");
  });

  it("rejette un titre ou un corps vide", () => {
    expect(JournalEntryInputSchema.safeParse({ title: "", body: "x" }).success).toBe(
      false,
    );
    expect(JournalEntryInputSchema.safeParse({ title: "x", body: "" }).success).toBe(
      false,
    );
  });

  it("rejette un kind inconnu", () => {
    expect(
      JournalEntryInputSchema.safeParse({ title: "x", body: "y", kind: "AUTRE" }).success,
    ).toBe(false);
  });

  it("a un libellé pour chaque valeur de JOURNAL_KINDS", () => {
    for (const kind of JOURNAL_KINDS) {
      expect(JOURNAL_KIND_LABELS[kind]).toBeTruthy();
    }
  });
});
