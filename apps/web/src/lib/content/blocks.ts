import { LESSON_BLOCK_COMPONENTS } from "@atelier/domain";

/**
 * Validation de la numérotation des blocs pédagogiques.
 *
 * Chaque leçon MDX doit numéroter explicitement ses blocs :
 *
 * ```mdx
 * <Texte n={1} titre="…">…</Texte>
 * <ErreurFrequente n={2}>…</ErreurFrequente>
 * ```
 *
 * **Pourquoi une numérotation explicite plutôt qu'une analyse d'arbre
 * syntaxique (AST) automatique ?** Une analyse via `remark`/`mdast` compterait
 * les blocs correctement, mais n'apporte rien de plus que ce simple contrôle
 * par expression régulière — alors qu'elle ajoute une dépendance et une
 * étape de compilation supplémentaires. En contrepartie, la numérotation
 * explicite sert aussi d'ancre HTML stable (`id="bloc-3"`) pour la reprise de
 * lecture (« reprise exacte » — feuille de route M2), et détecte une erreur
 * de copier-coller d'auteur (un bloc dupliqué garde le même `n`) que l'AST
 * ne détecterait pas non plus sans une vérification dédiée.
 *
 * C'est cette même fonction qui calcule `Lesson.blockCount` à la
 * synchronisation et qui est testée directement (aucune leçon réelle n'a
 * besoin d'exister pour la tester).
 */

const BLOCK_TAG_PATTERN = new RegExp(
  `<(${LESSON_BLOCK_COMPONENTS.join("|")})\\b[^>]*?\\bn=\\{(\\d+)\\}`,
  "g",
);

export interface BlockNumberingError {
  /** Position 1-indexée dans l'ordre d'apparition du fichier. */
  position: number;
  componentName: string;
  found: number;
  expected: number;
}

export interface BlockNumberingResult {
  valid: boolean;
  blockCount: number;
  error?: BlockNumberingError;
}

/**
 * Analyse le texte source MDX et vérifie que les blocs sont numérotés
 * `1, 2, 3, …` sans trou ni doublon, dans l'ordre où ils apparaissent.
 *
 * N'échoue jamais par exception : retourne un résultat structuré, à charge de
 * l'appelant (le script de synchronisation) de décider comment le rapporter —
 * c'est lui qui connaît le chemin du fichier fautif.
 */
export function validateBlockNumbering(source: string): BlockNumberingResult {
  const matches = [...source.matchAll(BLOCK_TAG_PATTERN)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const expected = i + 1;
    const found = Number(match[2]);

    if (found !== expected) {
      return {
        valid: false,
        blockCount: matches.length,
        error: {
          position: expected,
          componentName: match[1]!,
          found,
          expected,
        },
      };
    }
  }

  return { valid: true, blockCount: matches.length };
}

/** Formate une erreur de numérotation en message lisible pour un humain. */
export function formatBlockNumberingError(error: BlockNumberingError): string {
  return (
    `numérotation de bloc incorrecte : le ${error.position}ᵉ bloc rencontré ` +
    `(<${error.componentName}>) porte n={${error.found}}, attendu n={${error.expected}}. ` +
    `Les blocs doivent être numérotés 1, 2, 3… sans trou ni doublon, dans ` +
    `l'ordre du fichier.`
  );
}
