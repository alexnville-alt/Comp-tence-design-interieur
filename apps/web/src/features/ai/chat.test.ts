import { describe, expect, it } from "vitest";
import { CHAT_SYSTEM_PROMPT, buildLessonContextMessage, toChatHistory } from "./chat";

describe("CHAT_SYSTEM_PROMPT", () => {
  it("ne contient aucune donnée variable (date, identifiant)", () => {
    // Un ADR-0005 strict : le préfixe doit rester stable pour bénéficier du
    // cache de prompt. Une date ou un UUID interpolés le rendraient différent
    // à chaque appel.
    expect(CHAT_SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(CHAT_SYSTEM_PROMPT).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("mentionne l'ordre de grandeur pour les budgets", () => {
    expect(CHAT_SYSTEM_PROMPT).toMatch(/ordre de grandeur/);
  });
});

describe("buildLessonContextMessage", () => {
  it("porte le titre et le résumé de la leçon dans un message utilisateur", () => {
    const message = buildLessonContextMessage({
      title: "Le vocabulaire de base",
      summary: "Volume, circulation, zone, point focal, palette.",
    });
    expect(message.role).toBe("user");
    expect(message.content).toContain("Le vocabulaire de base");
    expect(message.content).toContain("Volume, circulation, zone, point focal, palette.");
  });
});

describe("toChatHistory", () => {
  it("mappe USER/ASSISTANT vers user/assistant", () => {
    const history = toChatHistory([
      { role: "USER", content: "Bonjour" },
      { role: "ASSISTANT", content: "Bonjour, comment puis-je vous aider ?" },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Bonjour" },
      { role: "assistant", content: "Bonjour, comment puis-je vous aider ?" },
    ]);
  });

  it("exclut les messages SYSTEM du contexte envoyé au fournisseur", () => {
    const history = toChatHistory([
      { role: "USER", content: "Une question à risque." },
      { role: "SYSTEM", content: "Quota atteint." },
    ]);
    expect(history).toEqual([{ role: "user", content: "Une question à risque." }]);
  });

  it("renvoie un tableau vide pour un historique vide", () => {
    expect(toChatHistory([])).toEqual([]);
  });
});
