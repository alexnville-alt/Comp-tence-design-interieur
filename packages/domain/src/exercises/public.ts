import type { ExerciseFrontmatter } from "./schema";

/**
 * Projection d'un exercice sans sa clé de correction, envoyée au client.
 *
 * Pour QUIZ_MCQ, QUIZ_TRUE_FALSE, HOTSPOT, PALETTE et MATERIAL_CHOICE, la
 * bonne réponse est un champ à part (`correctIndices`, `correct`,
 * `zones[].correct`…) : la retirer avant l'envoi au client est immédiat et
 * empêche de la lire dans les props ou la charge RSC.
 *
 * **Limite assumée** — pour QUIZ_MATCH et QUIZ_ORDER, la bonne réponse est
 * l'ordre même de déclaration de `pairs`/`items` (voir schema.ts) : la
 * masquer proprement demanderait de mélanger l'affichage côté serveur et de
 * ne transmettre que des index opaques, pour un exercice d'auto-formation
 * sans enjeu d'examen. Non fait pour l'instant — voir le rapport de
 * livraison M3.
 */
export type PublicExercise =
  | {
      type: "QUIZ_MCQ";
      slug: string;
      prompt: string;
      choices: string[];
    }
  | {
      type: "QUIZ_TRUE_FALSE";
      slug: string;
      prompt: string;
      statement: string;
    }
  | {
      type: "QUIZ_MATCH";
      slug: string;
      prompt: string;
      pairs: { left: string; right: string }[];
    }
  | {
      type: "QUIZ_ORDER";
      slug: string;
      prompt: string;
      items: string[];
    }
  | {
      type: "HOTSPOT";
      slug: string;
      prompt: string;
      imageLabel: string;
      zones: { x: number; y: number; radius: number; label: string }[];
    }
  | {
      type: "PALETTE";
      slug: string;
      prompt: string;
      brief: string;
      options: { label: string; hex: string }[];
    }
  | {
      type: "MATERIAL_CHOICE";
      slug: string;
      prompt: string;
      scenario: string;
      options: { label: string; description: string }[];
    };

export function toPublicExercise(exercise: ExerciseFrontmatter): PublicExercise {
  switch (exercise.type) {
    case "QUIZ_MCQ":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        choices: exercise.choices,
      };
    case "QUIZ_TRUE_FALSE":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        statement: exercise.statement,
      };
    case "QUIZ_MATCH":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        pairs: exercise.pairs,
      };
    case "QUIZ_ORDER":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        items: exercise.items,
      };
    case "HOTSPOT":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        imageLabel: exercise.imageLabel,
        zones: exercise.zones.map(({ x, y, radius, label }) => ({ x, y, radius, label })),
      };
    case "PALETTE":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        brief: exercise.brief,
        options: exercise.options,
      };
    case "MATERIAL_CHOICE":
      return {
        type: exercise.type,
        slug: exercise.slug,
        prompt: exercise.prompt,
        scenario: exercise.scenario,
        options: exercise.options,
      };
  }
}
