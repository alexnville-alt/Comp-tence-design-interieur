import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "./zod-json-schema";

const sampleSchema = z.object({
  titre: z.string().min(5),
  note: z.number().min(0).max(20),
  gravite: z.enum(["mineur", "moyen", "majeur"]),
  tags: z.array(z.string()).min(2),
  actif: z.boolean(),
  budget: z.enum(["0-100", "100-500"]).optional(),
  contact: z.string().email().optional(),
});

describe("zodToJsonSchema", () => {
  it("convertit un objet en JSON Schema avec les champs requis correctement listés", () => {
    const result = zodToJsonSchema(sampleSchema);
    expect(result).toMatchObject({
      type: "object",
      required: ["titre", "note", "gravite", "tags", "actif"],
    });
  });

  it("n'inclut pas les champs optionnels dans « required »", () => {
    const result = zodToJsonSchema(sampleSchema) as { required: string[] };
    expect(result.required).not.toContain("budget");
    expect(result.required).not.toContain("contact");
  });

  it("traduit les contraintes de chaîne (min, email)", () => {
    const result = zodToJsonSchema(sampleSchema) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(result.properties.titre).toMatchObject({ type: "string", minLength: 5 });
    expect(result.properties.contact).toMatchObject({ type: "string", format: "email" });
  });

  it("traduit les contraintes numériques (min, max)", () => {
    const result = zodToJsonSchema(sampleSchema) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(result.properties.note).toMatchObject({
      type: "number",
      minimum: 0,
      maximum: 20,
    });
  });

  it("traduit un entier avec .int() en type « integer »", () => {
    const result = zodToJsonSchema(z.object({ n: z.number().int() })) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(result.properties.n?.type).toBe("integer");
  });

  it("traduit un enum en énumération de chaînes", () => {
    const result = zodToJsonSchema(sampleSchema) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(result.properties.gravite).toEqual({
      type: "string",
      enum: ["mineur", "moyen", "majeur"],
    });
  });

  it("traduit un tableau avec sa longueur minimale", () => {
    const result = zodToJsonSchema(sampleSchema) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(result.properties.tags).toEqual({
      type: "array",
      items: { type: "string" },
      minItems: 2,
    });
  });

  it("traduit un littéral en « const »", () => {
    expect(zodToJsonSchema(z.literal("OPEN_CASE"))).toEqual({ const: "OPEN_CASE" });
  });

  it("traduit une union en « anyOf »", () => {
    const result = zodToJsonSchema(z.union([z.literal("a"), z.literal("b")]));
    expect(result).toEqual({ anyOf: [{ const: "a" }, { const: "b" }] });
  });

  it("traduit un champ nullable en « anyOf » avec le type null", () => {
    const result = zodToJsonSchema(z.string().nullable());
    expect(result).toEqual({ anyOf: [{ type: "string" }, { type: "null" }] });
  });

  it("traduit un tuple en tableau à longueur fixe", () => {
    const result = zodToJsonSchema(z.tuple([z.string(), z.number()]));
    expect(result).toEqual({
      type: "array",
      items: [{ type: "string" }, { type: "number" }],
      minItems: 2,
      maxItems: 2,
    });
  });

  it("traduit un record en objet à propriétés additionnelles typées", () => {
    const result = zodToJsonSchema(z.record(z.string(), z.number()));
    expect(result).toEqual({ type: "object", additionalProperties: { type: "number" } });
  });

  it("déballe un ZodEffects (refine) jusqu'au schéma sous-jacent", () => {
    const result = zodToJsonSchema(
      z
        .string()
        .min(3)
        .refine((s) => s.length > 0),
    );
    expect(result).toMatchObject({ type: "string", minLength: 3 });
  });

  it("déballe un champ avec valeur par défaut jusqu'au schéma sous-jacent", () => {
    const result = zodToJsonSchema(z.number().default(0));
    expect(result).toEqual({ type: "number" });
  });

  it("lève une erreur explicite pour un type Zod non pris en charge", () => {
    expect(() => zodToJsonSchema(z.function() as unknown as z.ZodTypeAny)).toThrow(
      /non pris en charge/,
    );
  });

  it("traduit .url() et .uuid() en formats JSON Schema", () => {
    expect(zodToJsonSchema(z.string().url())).toEqual({ type: "string", format: "uri" });
    expect(zodToJsonSchema(z.string().uuid())).toEqual({
      type: "string",
      format: "uuid",
    });
  });

  it("traduit un enum natif TypeScript", () => {
    enum Statut {
      Brouillon = "brouillon",
      Publie = "publie",
    }
    expect(zodToJsonSchema(z.nativeEnum(Statut))).toEqual({
      enum: ["brouillon", "publie"],
    });
  });

  it("traduit une date en chaîne au format date-time", () => {
    expect(zodToJsonSchema(z.date())).toEqual({ type: "string", format: "date-time" });
  });

  it("déballe directement un champ optionnel", () => {
    expect(zodToJsonSchema(z.string().optional())).toEqual({ type: "string" });
  });

  it("traduit une longueur de tableau exacte (.length()) en minItems = maxItems", () => {
    expect(zodToJsonSchema(z.array(z.string()).length(2))).toEqual({
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 2,
    });
  });
});
