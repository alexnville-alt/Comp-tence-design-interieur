import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiSchemaValidationError } from "./port";

describe("AiSchemaValidationError", () => {
  it("porte le message et les problèmes Zod d'origine", () => {
    const result = z.object({ note: z.number() }).safeParse({ note: "pas un nombre" });
    if (result.success) throw new Error("le schéma de test aurait dû rejeter la valeur");

    const error = new AiSchemaValidationError(
      "Réponse hors schéma.",
      result.error.issues,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AiSchemaValidationError");
    expect(error.message).toBe("Réponse hors schéma.");
    expect(error.issues).toBe(result.error.issues);
  });
});
