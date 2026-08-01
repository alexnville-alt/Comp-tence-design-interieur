import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateFakeValue } from "./fake-schema";

const sampleSchema = z.object({
  titre: z.string().min(5),
  note: z.number().min(0).max(20),
  gravite: z.enum(["mineur", "moyen", "majeur"]),
  tags: z.array(z.string()).min(2),
  actif: z.boolean(),
  budget: z.enum(["0-100", "100-500"]).optional(),
  contact: z.string().email().optional(),
  meta: z.object({ id: z.string().uuid() }),
});

describe("generateFakeValue", () => {
  it("produit une valeur qui valide le schéma dont elle est issue", () => {
    const value = generateFakeValue(sampleSchema);
    expect(() => sampleSchema.parse(value)).not.toThrow();
  });

  it("respecte la longueur minimale d'un tableau", () => {
    const value = generateFakeValue(sampleSchema) as { tags: string[] };
    expect(value.tags.length).toBeGreaterThanOrEqual(2);
  });

  it("respecte les bornes d'un nombre", () => {
    const value = generateFakeValue(sampleSchema) as { note: number };
    expect(value.note).toBeGreaterThanOrEqual(0);
    expect(value.note).toBeLessThanOrEqual(20);
  });

  it("choisit une valeur d'énumération valide", () => {
    const value = generateFakeValue(sampleSchema) as { gravite: string };
    expect(["mineur", "moyen", "majeur"]).toContain(value.gravite);
  });

  it("respecte la longueur minimale d'une chaîne", () => {
    const value = generateFakeValue(sampleSchema) as { titre: string };
    expect(value.titre.length).toBeGreaterThanOrEqual(5);
  });

  it("est déterministe : deux appels sur le même schéma produisent la même valeur", () => {
    expect(generateFakeValue(sampleSchema)).toEqual(generateFakeValue(sampleSchema));
  });

  it.each([
    ["littéral", z.literal("OPEN_CASE"), "OPEN_CASE"],
    ["booléen", z.boolean(), true],
  ] as const)("gère le type %s", (_label, schema, expected) => {
    expect(generateFakeValue(schema)).toBe(expected);
  });

  it("gère une union en choisissant la première option", () => {
    expect(generateFakeValue(z.union([z.literal("a"), z.literal("b")]))).toBe("a");
  });

  it("gère une union discriminée (distincte de ZodUnion) en choisissant la première option", () => {
    // Régression M6 : `z.discriminatedUnion` a un typeName Zod interne
    // différent de `z.union` — sans cas dédié, generateFakeValue échouait
    // sur `AnalysePhotoSchema`.
    const schema = z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), x: z.string() }),
      z.object({ type: z.literal("b"), y: z.number() }),
    ]);
    const value = generateFakeValue(schema) as { type: string };
    expect(value.type).toBe("a");
    expect(() => schema.parse(value)).not.toThrow();
  });

  it("gère un tuple", () => {
    const value = generateFakeValue(z.tuple([z.string(), z.number()])) as [
      string,
      number,
    ];
    expect(value).toHaveLength(2);
    expect(typeof value[0]).toBe("string");
    expect(typeof value[1]).toBe("number");
  });

  it("gère un record", () => {
    const schema = z.record(z.string(), z.number());
    const value = generateFakeValue(schema);
    expect(() => schema.parse(value)).not.toThrow();
  });

  it("gère un champ nullable", () => {
    const schema = z.string().nullable();
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });

  it("lève une erreur explicite pour un type Zod non pris en charge", () => {
    expect(() => generateFakeValue(z.function() as unknown as z.ZodTypeAny)).toThrow(
      /non pris en charge/,
    );
  });

  it("produit une adresse url pour .url()", () => {
    const schema = z.string().url();
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });

  it("produit un UUID pour .uuid(), stable pour un même chemin", () => {
    const schema = z.object({ id: z.string().uuid() });
    const value = generateFakeValue(schema) as { id: string };
    expect(() => schema.parse(value)).not.toThrow();
    expect(generateFakeValue(schema)).toEqual(value);
  });

  it("respecte la longueur maximale d'une chaîne", () => {
    const schema = z.string().min(1).max(3);
    const value = generateFakeValue(schema) as string;
    expect(value.length).toBeLessThanOrEqual(3);
  });

  it("respecte la borne maximale d'un nombre", () => {
    const schema = z.number().max(0);
    expect(generateFakeValue(schema)).toBeLessThanOrEqual(0);
  });

  it("respecte la longueur maximale d'un tableau", () => {
    const schema = z.array(z.string()).min(1).max(2);
    const value = generateFakeValue(schema) as unknown[];
    expect(value.length).toBeLessThanOrEqual(2);
  });

  it("gère un enum natif TypeScript", () => {
    enum Statut {
      Brouillon = "brouillon",
      Publie = "publie",
    }
    const schema = z.nativeEnum(Statut);
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });

  it("gère une date", () => {
    const schema = z.date();
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });

  it("gère une valeur par défaut en déballant le schéma sous-jacent", () => {
    const schema = z.number().default(0);
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });

  it("respecte une longueur de tableau exacte (.length())", () => {
    // Régression : `.length(n)` pose `exactLength`, pas `minLength`/
    // `maxLength` — l'ignorer produisait un tableau de longueur 1, rejeté
    // ensuite par le schéma (trouvé en E2E via `GradingFeedbackSchema`).
    const schema = z.object({ pointsForts: z.array(z.string()).length(2) });
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });

  it("produit une couleur hexadécimale pour une chaîne avec .regex() (régression M8)", () => {
    // `PaletteGenerationSchema` (M8) est le premier schéma passé à
    // `complete()` avec un champ `.regex()` — sans ce cas, `stringFor()`
    // ignorait le motif et produisait un texte de repli qui échouait
    // ensuite `schema.parse()` dans `fakeStructuredResult`.
    const schema = z.object({ hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
    const value = generateFakeValue(schema);
    expect(() => schema.parse(value)).not.toThrow();
  });

  it("lève une erreur explicite quand aucun candidat ne satisfait le motif", () => {
    const schema = z.string().regex(/^ZZZ$/);
    expect(() => generateFakeValue(schema)).toThrow(/aucune chaîne factice/);
  });

  it("gère un .refine() en déballant le schéma sous-jacent", () => {
    const schema = z
      .string()
      .min(3)
      .refine((s) => s.length > 0);
    expect(() => schema.parse(generateFakeValue(schema))).not.toThrow();
  });
});
