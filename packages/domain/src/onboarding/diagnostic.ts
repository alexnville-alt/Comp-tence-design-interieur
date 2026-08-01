/**
 * Diagnostic express — 5 questions posées à l'inscription (AUTH-02).
 *
 * Objectif : positionner l'apprenant sur un niveau de départ plutôt que de
 * lui imposer le niveau 1 alors qu'il maîtrise déjà les bases. Ce n'est pas
 * un examen : on ne bloque rien, on ne note rien. Le résultat est une simple
 * recommandation que l'utilisateur peut ignorer.
 *
 * Décision de conception : le niveau de départ est plafonné à 4. Au-delà,
 * l'apprenant sauterait les fondations (proportions, couleur, lumière) sur
 * lesquelles s'appuient toutes les phases suivantes — cinq questions ne
 * suffisent pas à justifier ce saut.
 */

export interface DiagnosticQuestion {
  id: string;
  prompt: string;
  /** Compétence évaluée — sert aussi à expliquer le résultat. */
  topic: "vocabulaire" | "proportions" | "couleur" | "lumiere" | "technique";
  choices: { id: string; label: string; points: number }[];
}

/**
 * Les questions sont graduées : un débutant complet répond « je ne sais pas »
 * sans se sentir en échec, un initié reconnaît le vocabulaire exact.
 */
export const DIAGNOSTIC_QUESTIONS: readonly DiagnosticQuestion[] = [
  {
    id: "q1",
    topic: "vocabulaire",
    prompt: "Dans une pièce, qu'appelle-t-on le « point focal » ?",
    choices: [
      { id: "a", label: "Le centre géométrique de la pièce", points: 0 },
      { id: "b", label: "L'élément qui attire le regard en premier", points: 2 },
      { id: "c", label: "L'endroit le plus éclairé", points: 0 },
      { id: "d", label: "Je ne sais pas", points: 0 },
    ],
  },
  {
    id: "q2",
    topic: "proportions",
    prompt: "Quelle largeur minimale prévoir pour un passage principal ?",
    choices: [
      { id: "a", label: "40 cm", points: 0 },
      { id: "b", label: "60 cm", points: 1 },
      { id: "c", label: "90 cm", points: 2 },
      { id: "d", label: "Je ne sais pas", points: 0 },
    ],
  },
  {
    id: "q3",
    topic: "couleur",
    prompt: "Que décrit la règle dite « 60-30-10 » ?",
    choices: [
      { id: "a", label: "La répartition d'une palette de couleurs", points: 2 },
      { id: "b", label: "Les proportions d'un meuble", points: 0 },
      { id: "c", label: "Le taux d'humidité idéal d'une pièce", points: 0 },
      { id: "d", label: "Je ne sais pas", points: 0 },
    ],
  },
  {
    id: "q4",
    topic: "lumiere",
    prompt: "Quelle température de couleur convient à un salon en soirée ?",
    choices: [
      { id: "a", label: "2700 K, blanc chaud", points: 2 },
      { id: "b", label: "4000 K, blanc neutre", points: 1 },
      { id: "c", label: "6500 K, blanc froid", points: 0 },
      { id: "d", label: "Je ne sais pas", points: 0 },
    ],
  },
  {
    id: "q5",
    topic: "technique",
    prompt: "Dans une rénovation, à quel moment pose-t-on le sol ?",
    choices: [
      { id: "a", label: "En tout premier, pour travailler au propre", points: 0 },
      { id: "b", label: "Après les travaux salissants, avant les finitions", points: 2 },
      { id: "c", label: "En tout dernier, une fois les meubles installés", points: 0 },
      { id: "d", label: "Je ne sais pas", points: 0 },
    ],
  },
] as const;

export const DIAGNOSTIC_MAX_SCORE = DIAGNOSTIC_QUESTIONS.reduce(
  (total, question) =>
    total + Math.max(...question.choices.map((choice) => choice.points)),
  0,
);

export interface DiagnosticResult {
  score: number;
  maxScore: number;
  /** Niveau recommandé, entre 1 et 4. */
  startingLevel: 1 | 2 | 3 | 4;
  /** Phrase affichée à l'utilisateur pour expliquer la recommandation. */
  rationale: string;
  /** Thèmes sur lesquels l'apprenant n'a marqué aucun point. */
  weakTopics: DiagnosticQuestion["topic"][];
}

/**
 * @param answers Association identifiant de question → identifiant de réponse.
 *                Les questions sans réponse comptent zéro point : l'apprenant
 *                peut sauter le diagnostic, il démarrera simplement au niveau 1.
 */
export function scoreDiagnostic(answers: Record<string, string>): DiagnosticResult {
  let score = 0;
  const weakTopics: DiagnosticQuestion["topic"][] = [];

  for (const question of DIAGNOSTIC_QUESTIONS) {
    const answerId = answers[question.id];
    const choice = question.choices.find((c) => c.id === answerId);
    const points = choice?.points ?? 0;
    score += points;
    if (points === 0) weakTopics.push(question.topic);
  }

  const ratio = DIAGNOSTIC_MAX_SCORE === 0 ? 0 : score / DIAGNOSTIC_MAX_SCORE;
  const { startingLevel, rationale } = recommend(ratio);

  return { score, maxScore: DIAGNOSTIC_MAX_SCORE, startingLevel, rationale, weakTopics };
}

function recommend(ratio: number): {
  startingLevel: 1 | 2 | 3 | 4;
  rationale: string;
} {
  if (ratio >= 0.85) {
    return {
      startingLevel: 4,
      rationale:
        "Vous maîtrisez déjà le vocabulaire et les règles de base. Nous vous " +
        "plaçons au niveau 4 — les trois premiers restent consultables à tout moment.",
    };
  }
  if (ratio >= 0.6) {
    return {
      startingLevel: 3,
      rationale:
        "De bonnes bases, notamment sur les proportions. Nous démarrons au " +
        "niveau 3 pour aller directement à la couleur.",
    };
  }
  if (ratio >= 0.3) {
    return {
      startingLevel: 2,
      rationale:
        "Vous connaissez quelques notions. Nous démarrons au niveau 2 pour " +
        "consolider les règles de composition.",
    };
  }
  return {
    startingLevel: 1,
    rationale:
      "Nous démarrons au niveau 1, depuis le tout début. C'est le meilleur " +
      "point de départ pour construire des bases solides.",
  };
}
