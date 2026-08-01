import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fakeAiProvider } from "./fake";

describe("fakeAiProvider.streamChat", () => {
  it("reprend le dernier message utilisateur dans la réponse", async () => {
    const chunks: string[] = [];
    for await (const chunk of fakeAiProvider.streamChat({
      system: "Tu es un assistant pédagogique.",
      messages: [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Bonjour, comment puis-je vous aider ?" },
        { role: "user", content: "Comment agrandir visuellement un studio ?" },
      ],
    })) {
      if (chunk.type === "delta") chunks.push(chunk.text);
    }
    expect(chunks.join("")).toContain("Comment agrandir visuellement un studio ?");
  });

  it("termine toujours par un événement « done » avec un usage positif", async () => {
    const events: string[] = [];
    let done: { usage: { inputTokens: number; outputTokens: number } } | undefined;
    for await (const chunk of fakeAiProvider.streamChat({
      system: "Système.",
      messages: [{ role: "user", content: "Question ?" }],
    })) {
      events.push(chunk.type);
      if (chunk.type === "done") done = chunk;
    }
    expect(events.at(-1)).toBe("done");
    expect(events.slice(0, -1).every((t) => t === "delta")).toBe(true);
    expect(done?.usage.inputTokens).toBeGreaterThan(0);
    expect(done?.usage.outputTokens).toBeGreaterThan(0);
  });

  it("ne plante pas et renvoie une question vide s'il n'y a aucun message utilisateur", async () => {
    const chunks: string[] = [];
    for await (const chunk of fakeAiProvider.streamChat({
      system: "Système.",
      messages: [{ role: "assistant", content: "Bonjour !" }],
    })) {
      if (chunk.type === "delta") chunks.push(chunk.text);
    }
    expect(chunks.join("")).toMatch(/«\s*»/);
  });
});

describe("fakeAiProvider.complete", () => {
  const schema = z.object({
    note: z.number().min(0).max(20),
    commentaires: z.array(z.string()).min(2),
  });

  it("retourne une donnée qui valide le schéma demandé", async () => {
    const result = await fakeAiProvider.complete({
      system: "Corrige selon le barème.",
      messages: [{ role: "user", content: "Réponse de l'apprenant." }],
      schema,
    });
    expect(() => schema.parse(result.data)).not.toThrow();
    expect(result.model).toBeTruthy();
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.costEuros).toBeGreaterThanOrEqual(0);
  });
});

describe("fakeAiProvider.analyzeImage", () => {
  const schema = z.object({
    styleDetecte: z.string(),
    confiance: z.number().min(0).max(1),
  });

  it("retourne une donnée qui valide le schéma demandé", async () => {
    const result = await fakeAiProvider.analyzeImage({
      system: "Analyse cette photo de pièce.",
      images: [{ base64: "ZmFrZQ==", mediaType: "image/jpeg" }],
      schema,
    });
    expect(() => schema.parse(result.data)).not.toThrow();
  });

  it("le coût augmente avec le nombre d'images fournies", async () => {
    const oneImage = await fakeAiProvider.analyzeImage({
      system: "Analyse.",
      images: [{ base64: "ZmFrZQ==", mediaType: "image/jpeg" }],
      schema,
    });
    const threeImages = await fakeAiProvider.analyzeImage({
      system: "Analyse.",
      images: [
        { base64: "ZmFrZQ==", mediaType: "image/jpeg" },
        { base64: "ZmFrZQ==", mediaType: "image/jpeg" },
        { base64: "ZmFrZQ==", mediaType: "image/jpeg" },
      ],
      schema,
    });
    expect(threeImages.usage.inputTokens).toBeGreaterThan(oneImage.usage.inputTokens);
  });
});
