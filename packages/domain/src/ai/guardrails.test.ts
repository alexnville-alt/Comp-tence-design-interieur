import { describe, expect, it } from "vitest";
import { detectRiskyTopic } from "./guardrails";

describe("detectRiskyTopic", () => {
  it.each([
    ["Est-ce que ce mur est porteur ?", "mur_porteur"],
    ["Je voudrais abattre un mur entre le salon et la cuisine.", "mur_porteur"],
    ["Puis-je casser ce mur porteur pour agrandir la pièce ?", "mur_porteur"],
    ["Le tableau électrique est-il aux normes électriques ?", "electricite"],
    ["Je veux refaire l'électricité moi-même, c'est possible ?", "electricite"],
    ["Il y a une odeur de gaz près de la chaudière à gaz.", "gaz"],
    ["Le diagnostic a détecté de l'amiante dans le sol.", "amiante"],
    ["Les canalisations contiennent du plomb, c'est dangereux ?", "plomb"],
  ] as const)("détecte le sujet à risque dans : %s", (message, expectedTopic) => {
    const result = detectRiskyTopic(message);
    expect(result?.topic).toBe(expectedTopic);
  });

  it("renvoie un message qui recommande un professionnel, sans jargon technique de résolution", () => {
    const result = detectRiskyTopic("Ce mur est-il porteur ?");
    expect(result?.message).toMatch(/professionnel|bureau d'études|maçon/i);
  });

  it("ne déclenche rien sur une question ordinaire de décoration", () => {
    expect(detectRiskyTopic("Quelle couleur pour mon salon orienté nord ?")).toBeNull();
    expect(detectRiskyTopic("Comment organiser mon plan de travail ?")).toBeNull();
  });

  it("ne confond pas « plomberie »/« plombier » (bénins) avec « plomb » (le matériau à risque)", () => {
    expect(
      detectRiskyTopic("Quel plombier recommandez-vous pour la plomberie ?"),
    ).toBeNull();
  });

  it("est insensible à la casse", () => {
    expect(detectRiskyTopic("MUR PORTEUR ?")?.topic).toBe("mur_porteur");
  });
});
