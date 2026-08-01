import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AiProvider } from "./port";
import { fakeAiProvider } from "./adapters/fake";

/**
 * Tests de contrat (ADR-0005, ADR-0011) : la même suite s'exécute à
 * l'identique sur tous les adaptateurs enregistrés ci-dessous. L'adaptateur
 * factice tourne toujours (CI comprise) ; l'adaptateur Anthropic ne s'ajoute
 * que si `AI_LIVE=1` est positionné à la main — jamais en CI, pour ne pas
 * dépendre d'un réseau ni d'une clé API dans le pipeline.
 */
const providers: Array<{ name: string; provider: AiProvider }> = [
  { name: "fake", provider: fakeAiProvider },
];

if (process.env.AI_LIVE === "1") {
  const { anthropicProvider } = await import("./adapters/anthropic");
  providers.push({ name: "anthropic", provider: anthropicProvider });
}

describe.each(providers)("AiProvider — $name", ({ provider }) => {
  it("streamChat produit des fragments puis se termine par un événement « done » à l'usage positif", async () => {
    const chunks: Awaited<ReturnType<AiProvider["streamChat"]>> extends AsyncIterable<
      infer C
    >
      ? C[]
      : never = [];
    for await (const chunk of provider.streamChat({
      system: "Tu es un assistant pédagogique en design d'intérieur.",
      messages: [{ role: "user", content: "Comment organiser un petit salon ?" }],
    })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.slice(0, -1).every((c) => c.type === "delta")).toBe(true);
    const last = chunks.at(-1);
    expect(last?.type).toBe("done");
    if (last?.type === "done") {
      expect(last.usage.inputTokens).toBeGreaterThan(0);
      expect(last.usage.outputTokens).toBeGreaterThan(0);
      expect(last.costEuros).toBeGreaterThanOrEqual(0);
      expect(last.model).toBeTruthy();
    }
  }, 30_000);

  it("complete() retourne une donnée qui valide le schéma demandé", async () => {
    const schema = z.object({
      note: z.number().min(0).max(20),
      commentaires: z.array(z.string()).min(2),
    });
    const result = await provider.complete({
      system: "Corrige cette réponse selon le barème fourni.",
      messages: [
        { role: "user", content: "Réponse de l'apprenant : agencer un salon de 20 m²." },
      ],
      schema,
    });
    expect(() => schema.parse(result.data)).not.toThrow();
    expect(result.model).toBeTruthy();
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.costEuros).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it("analyzeImage() retourne une donnée qui valide le schéma demandé", async () => {
    const schema = z.object({
      styleDetecte: z.string(),
      confiance: z.number().min(0).max(1),
    });
    const result = await provider.analyzeImage({
      system: "Analyse cette photo de pièce et déduis-en le style.",
      images: [{ base64: "ZmFrZQ==", mediaType: "image/jpeg" }],
      schema,
    });
    expect(() => schema.parse(result.data)).not.toThrow();
  }, 30_000);

  it("embed() retourne un vecteur distinct par texte, dans le même ordre", async () => {
    const result = await provider.embed({
      texts: ["Chêne huilé", "Béton ciré"],
      inputType: "document",
    });
    expect(result.embeddings).toHaveLength(2);
    expect(result.embeddings[0]).not.toEqual(result.embeddings[1]);
    expect(result.model).toBeTruthy();
    expect(result.costEuros).toBeGreaterThanOrEqual(0);
  }, 30_000);
});
