import matter from "gray-matter";
import type { z, ZodError, ZodType } from "zod";

/**
 * Erreur de validation de contenu, systématiquement rattachée au chemin du
 * fichier fautif.
 *
 * C'est ce rattachement qui rend l'échec du script de synchronisation
 * exploitable (docs/05 M2, critère d'acceptation : « un frontmatter invalide
 * fait échouer le build avec un message exploitable ») — une erreur Zod brute
 * dit *quoi* est invalide mais jamais *où*, ce qui est inutilisable dès qu'on
 * a plus d'une poignée de fichiers de contenu.
 */
export class ContentValidationError extends Error {
  constructor(
    public readonly filePath: string,
    message: string,
  ) {
    super(`${filePath} — ${message}`);
    this.name = "ContentValidationError";
  }
}

/** Met en forme les problèmes Zod en une liste à puces lisible. */
export function formatZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(racine)"} : ${issue.message}`)
    .join("\n");
}

export interface ParsedFrontmatter<T> {
  data: T;
  /** Corps du fichier après le frontmatter — le MDX à compiler. */
  content: string;
}

/**
 * Analyse un fichier `.mdx` et valide son frontmatter YAML contre un schéma
 * Zod.
 *
 * @throws {ContentValidationError} si le frontmatter ne valide pas — le
 *   message inclut le chemin du fichier et le détail de chaque champ en
 *   cause, pas seulement le premier trouvé.
 *
 * Le générique porte sur le schéma (`S`), pas directement sur `T` : faire
 * inférer `T` depuis un paramètre `ZodType<T>` pousse TypeScript à unifier
 * sur le type d'*entrée* du schéma (où les champs `.default()` sont
 * optionnels) plutôt que sur sa *sortie* — `z.output<S>` lève l'ambiguïté.
 */
export function parseFrontmatter<S extends ZodType>(
  filePath: string,
  rawSource: string,
  schema: S,
): ParsedFrontmatter<z.output<S>> {
  const { data, content } = matter(rawSource);

  const result = schema.safeParse(data) as z.SafeParseReturnType<z.input<S>, z.output<S>>;
  if (!result.success) {
    throw new ContentValidationError(
      filePath,
      `frontmatter invalide :\n${formatZodIssues(result.error)}`,
    );
  }

  return { data: result.data, content };
}
