import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_MAX_SCORE,
  DIAGNOSTIC_QUESTIONS,
  scoreDiagnostic,
} from "./diagnostic";

/** Construit un jeu de réponses en sélectionnant le meilleur choix. */
function perfectAnswers(): Record<string, string> {
  return Object.fromEntries(
    DIAGNOSTIC_QUESTIONS.map((question) => {
      const best = [...question.choices].sort((a, b) => b.points - a.points)[0]!;
      return [question.id, best.id];
    }),
  );
}

describe("scoreDiagnostic", () => {
  it("place un débutant complet au niveau 1", () => {
    const result = scoreDiagnostic({});
    expect(result.score).toBe(0);
    expect(result.startingLevel).toBe(1);
    expect(result.weakTopics).toHaveLength(DIAGNOSTIC_QUESTIONS.length);
  });

  it("place un sans-faute au niveau 4", () => {
    const result = scoreDiagnostic(perfectAnswers());
    expect(result.score).toBe(DIAGNOSTIC_MAX_SCORE);
    expect(result.startingLevel).toBe(4);
    expect(result.weakTopics).toEqual([]);
  });

  it("ne dépasse jamais le niveau 4, même avec un sans-faute", () => {
    // Décision assumée : cinq questions ne suffisent pas à justifier de sauter
    // les fondations sur lesquelles reposent toutes les phases suivantes.
    expect(scoreDiagnostic(perfectAnswers()).startingLevel).toBeLessThanOrEqual(4);
  });

  it("place un profil solide mais imparfait au niveau 3", () => {
    // 6 points sur 10 → ratio 0,6 : de bonnes bases, sans sans-faute.
    const result = scoreDiagnostic({ q1: "b", q2: "c", q3: "a" });
    expect(result.score).toBe(6);
    expect(result.startingLevel).toBe(3);
  });

  it("exige un quasi-sans-faute pour atteindre le niveau 4", () => {
    // 8 points sur 10 → ratio 0,8 : sous le seuil de 0,85, on reste au niveau 3.
    const result = scoreDiagnostic({ q1: "b", q2: "c", q3: "a", q4: "a" });
    expect(result.score).toBe(8);
    expect(result.startingLevel).toBe(3);
  });

  it("place un niveau intermédiaire entre 2 et 3", () => {
    // Deux bonnes réponses sur cinq → ratio 4/10 = 0,4
    const result = scoreDiagnostic({ q1: "b", q2: "c" });
    expect(result.score).toBe(4);
    expect(result.startingLevel).toBe(2);
  });

  it("accorde les points partiels des réponses approchantes", () => {
    // q2 « 60 cm » vaut 1 point : proche, mais insuffisant en passage principal.
    expect(scoreDiagnostic({ q2: "b" }).score).toBe(1);
    expect(scoreDiagnostic({ q2: "c" }).score).toBe(2);
  });

  it("liste les thèmes où aucun point n'a été marqué", () => {
    const result = scoreDiagnostic({ q1: "b", q3: "a" });
    expect(result.weakTopics).toEqual(["proportions", "lumiere", "technique"]);
    expect(result.weakTopics).not.toContain("vocabulaire");
  });

  it("compte « je ne sais pas » comme zéro sans pénalité", () => {
    const dontKnow = Object.fromEntries(
      DIAGNOSTIC_QUESTIONS.map((question) => [question.id, "d"]),
    );
    const result = scoreDiagnostic(dontKnow);
    expect(result.score).toBe(0);
    expect(result.startingLevel).toBe(1);
  });

  it("ignore un identifiant de réponse inconnu", () => {
    expect(scoreDiagnostic({ q1: "zzz" }).score).toBe(0);
  });

  it("ignore une question inconnue", () => {
    expect(scoreDiagnostic({ inexistante: "b" }).score).toBe(0);
  });

  it("fournit toujours une explication à afficher", () => {
    for (const answers of [{}, { q1: "b", q2: "c" }, perfectAnswers()]) {
      expect(scoreDiagnostic(answers).rationale.length).toBeGreaterThan(20);
    }
  });

  it("garantit que chaque question a exactement une meilleure réponse", () => {
    for (const question of DIAGNOSTIC_QUESTIONS) {
      const max = Math.max(...question.choices.map((c) => c.points));
      const bestCount = question.choices.filter((c) => c.points === max).length;
      expect(bestCount, `question ${question.id}`).toBe(1);
    }
  });
});
