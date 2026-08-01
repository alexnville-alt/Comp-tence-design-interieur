import { z } from "zod";

/**
 * Convertit un schéma Zod (classique, `@atelier/domain`) en JSON Schema pour
 * `output_config.format` (docs/02 §5.3).
 *
 * Pourquoi pas le `zodOutputFormat()` fourni par `@anthropic-ai/sdk` : cet
 * utilitaire attend un schéma `zod/v4` et lit sa représentation interne
 * (`_zod`), incompatible avec les schémas `zod` v3 classiques que
 * `packages/domain` construit (ADR-0009 : ce paquet n'importe que `zod` v3).
 * Faire transiter nos schémas par le convertisseur v4 romprait silencieusement
 * à l'exécution — pas seulement au typage. Ce petit convertisseur maison reste
 * dans notre version de Zod et ne couvre que ce que nos schémas utilisent
 * réellement.
 *
 * La validation de la réponse reste, de toute façon, toujours faite
 * nous-mêmes via `schema.parse()` (docs/02 §5.4, niveau 3) — ce JSON Schema
 * ne sert qu'à guider la génération, jamais à se substituer à cette
 * validation.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // `_def.typeName` n'existe que sur les sous-types concrets ; sur le type de
  // base `ZodTypeAny` il est vu comme `any`. Ce cast unique, explicite, évite
  // de désactiver la vérification enum-vs-chaîne pour tout le `switch`.
  const typeName = (schema._def as { typeName: z.ZodFirstPartyTypeKind }).typeName;

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return stringSchema(schema as z.ZodString);
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return numberSchema(schema as z.ZodNumber);
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return { type: "boolean" };
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return { const: (schema as z.ZodLiteral<unknown>)._def.value };
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return {
        type: "string",
        enum: (schema as z.ZodEnum<[string, ...string[]]>)._def.values,
      };
    case z.ZodFirstPartyTypeKind.ZodNativeEnum:
      return {
        enum: Object.values((schema as z.ZodNativeEnum<never>)._def.values),
      };
    case z.ZodFirstPartyTypeKind.ZodDate:
      return { type: "string", format: "date-time" };
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return zodToJsonSchema((schema as z.ZodOptional<z.ZodTypeAny>)._def.innerType);
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return zodToJsonSchema((schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType);
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return zodToJsonSchema((schema as z.ZodEffects<z.ZodTypeAny>)._def.schema);
    case z.ZodFirstPartyTypeKind.ZodNullable: {
      const inner = zodToJsonSchema(
        (schema as z.ZodNullable<z.ZodTypeAny>)._def.innerType,
      );
      return { anyOf: [inner, { type: "null" }] };
    }
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return {
        anyOf: (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>)._def.options.map(
          (option) => zodToJsonSchema(option),
        ),
      };
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const arraySchema = schema as z.ZodArray<z.ZodTypeAny>;
      const result: Record<string, unknown> = {
        type: "array",
        items: zodToJsonSchema(arraySchema._def.type),
      };
      if (arraySchema._def.exactLength) {
        result.minItems = arraySchema._def.exactLength.value;
        result.maxItems = arraySchema._def.exactLength.value;
      } else {
        if (arraySchema._def.minLength)
          result.minItems = arraySchema._def.minLength.value;
        if (arraySchema._def.maxLength)
          result.maxItems = arraySchema._def.maxLength.value;
      }
      return result;
    }
    case z.ZodFirstPartyTypeKind.ZodTuple: {
      const items = (schema as z.ZodTuple)._def.items as z.ZodTypeAny[];
      return {
        type: "array",
        items: items.map((item) => zodToJsonSchema(item)),
        minItems: items.length,
        maxItems: items.length,
      };
    }
    case z.ZodFirstPartyTypeKind.ZodRecord: {
      const recordSchema = schema as z.ZodRecord;
      return {
        type: "object",
        additionalProperties: zodToJsonSchema(recordSchema._def.valueType),
      };
    }
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>)._def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, fieldSchema] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(fieldSchema);
        if (!isOptionalField(fieldSchema)) required.push(key);
      }
      return { type: "object", properties, required, additionalProperties: false };
    }
    default:
      throw new Error(
        `zodToJsonSchema : type Zod non pris en charge « ${typeName} » — ` +
          "élargir ce convertisseur plutôt que d'ajouter un contournement ponctuel.",
      );
  }
}

function isOptionalField(schema: z.ZodTypeAny): boolean {
  const typeName = (schema._def as { typeName: z.ZodFirstPartyTypeKind }).typeName;
  return (
    typeName === z.ZodFirstPartyTypeKind.ZodOptional ||
    typeName === z.ZodFirstPartyTypeKind.ZodDefault
  );
}

function stringSchema(schema: z.ZodString): Record<string, unknown> {
  const result: Record<string, unknown> = { type: "string" };
  for (const check of schema._def.checks) {
    if (check.kind === "min") result.minLength = check.value;
    if (check.kind === "max") result.maxLength = check.value;
    if (check.kind === "email") result.format = "email";
    if (check.kind === "url") result.format = "uri";
    if (check.kind === "uuid") result.format = "uuid";
  }
  return result;
}

function numberSchema(schema: z.ZodNumber): Record<string, unknown> {
  const result: Record<string, unknown> = { type: "number" };
  for (const check of schema._def.checks) {
    if (check.kind === "min") result.minimum = check.value;
    if (check.kind === "max") result.maximum = check.value;
    if (check.kind === "int") result.type = "integer";
  }
  return result;
}
