import { z } from "zod";

/**
 * Génère une valeur factice, déterministe, qui satisfait un schéma Zod
 * arbitraire — le cœur de l'adaptateur factice (`fake.ts`) : `complete()` et
 * `analyzeImage()` sont génériques sur `<T>`, ils ne connaissent pas à
 * l'avance la forme des schémas `AnalysePhoto`, `GradingFeedback`, etc. que
 * les fonctionnalités leur passeront. Plutôt que de coder une valeur factice
 * par fonctionnalité (ce qui romprait le contrat « même code testé sur les
 * deux adaptateurs » dès qu'un nouveau schéma apparaît), ce module fabrique
 * une valeur valide en parcourant la structure du schéma lui-même.
 *
 * Déterministe par construction : aucun `Math.random`, aucune horloge. Le
 * `path` (nom des clés traversées) sert de seed textuelle pour varier les
 * chaînes générées sans dépendre du hasard.
 */

function placeholderString(path: string): string {
  return path ? `donnée factice — ${path}` : "donnée factice";
}

function stringFor(schema: z.ZodString, path: string): string {
  const checks = schema._def.checks;
  const kinds = new Set(checks.map((c) => c.kind));
  if (kinds.has("email")) return "factice@exemple.fr";
  if (kinds.has("url")) return "https://exemple.fr/factice";
  if (kinds.has("uuid"))
    return "00000000-0000-4000-8000-000000000000".replace(
      "000000",
      Math.abs(hashCode(path)).toString(16).padStart(6, "0").slice(0, 6),
    );
  let value = placeholderString(path);
  for (const check of checks) {
    if (check.kind === "min" && value.length < check.value) {
      value = value.padEnd(check.value, " ·");
    }
    if (check.kind === "max" && value.length > check.value) {
      value = value.slice(0, Math.max(check.value, 0));
    }
  }
  return value;
}

function hashCode(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function numberFor(schema: z.ZodNumber): number {
  const checks = schema._def.checks;
  let min = -Infinity;
  let max = Infinity;
  let isInt = false;
  for (const check of checks) {
    if (check.kind === "min") min = check.inclusive ? check.value : check.value + 1;
    if (check.kind === "max") max = check.inclusive ? check.value : check.value - 1;
    if (check.kind === "int") isInt = true;
  }
  let value = 1;
  if (Number.isFinite(min) && value < min) value = min;
  if (Number.isFinite(max) && value > max) value = max;
  if (isInt) value = Math.round(value);
  return value;
}

function arrayLengthFor(schema: z.ZodArray<z.ZodTypeAny>): number {
  // `.length(n)` (ex. `GradingFeedbackSchema.pointsForts`, exactement 2
  // éléments) pose `exactLength`, pas `minLength`/`maxLength` — l'ignorer
  // produisait un tableau de longueur 1, que le schéma rejetait ensuite à la
  // validation. Trouvé en E2E (`ia.spec.ts`) : `complete()` échouait
  // silencieusement sur tout schéma utilisant `.length()`.
  if (schema._def.exactLength) return schema._def.exactLength.value;
  const min = schema._def.minLength?.value ?? 1;
  const max = schema._def.maxLength?.value;
  const length = Math.max(min, 1);
  return max !== undefined ? Math.min(length, max) : length;
}

/** Fabrique une valeur factice valide pour un schéma Zod arbitraire. */
export function generateFakeValue(schema: z.ZodTypeAny, path = ""): unknown {
  // `_def.typeName` n'existe que sur les sous-types concrets ; sur le type de
  // base `ZodTypeAny` il est vu comme `any`. Ce cast unique, explicite, évite
  // de désactiver la vérification enum-vs-chaîne pour tout le `switch`.
  const typeName = (schema._def as { typeName: z.ZodFirstPartyTypeKind }).typeName;

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return stringFor(schema as z.ZodString, path);
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return numberFor(schema as z.ZodNumber);
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return true;
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return (schema as z.ZodLiteral<unknown>)._def.value;
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return (schema as z.ZodEnum<[string, ...string[]]>)._def.values[0];
    case z.ZodFirstPartyTypeKind.ZodNativeEnum: {
      const values = Object.values((schema as z.ZodNativeEnum<never>)._def.values);
      return values[0];
    }
    case z.ZodFirstPartyTypeKind.ZodDate:
      return new Date("2026-08-01T00:00:00.000Z");
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return generateFakeValue(
        (schema as z.ZodOptional<z.ZodTypeAny>)._def.innerType,
        path,
      );
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return generateFakeValue(
        (schema as z.ZodNullable<z.ZodTypeAny>)._def.innerType,
        path,
      );
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return generateFakeValue(
        (schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType,
        path,
      );
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return generateFakeValue((schema as z.ZodEffects<z.ZodTypeAny>)._def.schema, path);
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return generateFakeValue(
        (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>)._def.options[0],
        path,
      );
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const arraySchema = schema as z.ZodArray<z.ZodTypeAny>;
      const length = arrayLengthFor(arraySchema);
      return Array.from({ length }, (_, i) =>
        generateFakeValue(arraySchema._def.type, `${path}[${i}]`),
      );
    }
    case z.ZodFirstPartyTypeKind.ZodTuple: {
      const items = (schema as z.ZodTuple)._def.items as z.ZodTypeAny[];
      return items.map((item, i) => generateFakeValue(item, `${path}[${i}]`));
    }
    case z.ZodFirstPartyTypeKind.ZodRecord: {
      const recordSchema = schema as z.ZodRecord;
      const key = "clé";
      return { [key]: generateFakeValue(recordSchema._def.valueType, `${path}.${key}`) };
    }
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>)._def.shape();
      const result: Record<string, unknown> = {};
      for (const [key, fieldSchema] of Object.entries(shape)) {
        result[key] = generateFakeValue(fieldSchema, path ? `${path}.${key}` : key);
      }
      return result;
    }
    default:
      throw new Error(
        `adaptateur factice IA : type Zod non pris en charge « ${typeName} » (${path || "racine"}) — ` +
          "élargir generateFakeValue plutôt que d'ajouter un cas particulier par fonctionnalité.",
      );
  }
}
