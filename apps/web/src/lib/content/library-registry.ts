import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { LibraryItemFrontmatterSchema } from "@atelier/domain";
import type { LIB_CATEGORIES, LibraryItemFrontmatter } from "@atelier/domain";
import { ContentValidationError, parseFrontmatter } from "./frontmatter";

/**
 * Lecture et validation des fiches bibliothèque (docs/05 M7, ADR-0010).
 *
 * Même principe que `registry.ts` (leçons) : une fonction pure, testable sans
 * base de données, appliquée au contenu **réel** du dépôt — l'exécuter en
 * test vaut aussi comme vérification permanente que les fiches publiées
 * restent bien formées.
 *
 * Attendu sur le disque :
 * ```
 * content/bibliotheque/<categorie-en-kebab-case>/<slug>.mdx
 * ```
 * Le dossier de catégorie (`wood`, `wall-covering`…) est une aide de
 * classement pour un humain qui parcourt le dépôt ; la catégorie qui compte
 * est celle déclarée dans le frontmatter (`category: WOOD`) — une
 * incohérence entre les deux est une erreur, pas une variante tolérée, même
 * principe que la numérotation des leçons dans `registry.ts`.
 *
 * Le corps MDX (sous le frontmatter) n'est pas exploité pour l'instant : tout
 * le contenu structuré vit dans le frontmatter (docs/04 §3.8 ne prévoit pas
 * de champ de corps pour `LibraryItem`). Le format `.mdx` est gardé pour
 * rester cohérent avec le reste du contenu édité en Git (ADR-0010) et laisser
 * la porte ouverte à une élaboration en prose, si un besoin apparaît plus
 * tard, sans migration de format.
 */

export interface ContentLibraryItem {
  filePath: string;
  frontmatter: LibraryItemFrontmatter;
}

function categoryFolderName(category: (typeof LIB_CATEGORIES)[number]): string {
  return category.toLowerCase().replace(/_/g, "-");
}

export function scanLibrary(contentRoot: string): ContentLibraryItem[] {
  const libraryRoot = join(contentRoot, "bibliotheque");
  const items: ContentLibraryItem[] = [];

  const categoryFolders = readdirSync(libraryRoot).filter((entry) =>
    statSync(join(libraryRoot, entry)).isDirectory(),
  );

  for (const folder of categoryFolders) {
    const folderPath = join(libraryRoot, folder);
    const files = readdirSync(folderPath).filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const filePath = join(folderPath, file);
      const raw = readFileSync(filePath, "utf-8");
      const { data: frontmatter } = parseFrontmatter(
        filePath,
        raw,
        LibraryItemFrontmatterSchema,
      );

      const expectedFolder = categoryFolderName(frontmatter.category);
      if (folder !== expectedFolder) {
        throw new ContentValidationError(
          filePath,
          `catégorie « ${frontmatter.category} » déclarée dans le frontmatter, mais le fichier est ` +
            `rangé dans le dossier « ${folder} » (attendu : « ${expectedFolder} »).`,
        );
      }

      items.push({ filePath, frontmatter });
    }
  }

  const seenSlugs = new Map<string, string>();
  for (const item of items) {
    const previous = seenSlugs.get(item.frontmatter.slug);
    if (previous) {
      throw new ContentValidationError(
        item.filePath,
        `slug « ${item.frontmatter.slug} » déjà utilisé par ${previous}.`,
      );
    }
    seenSlugs.set(item.frontmatter.slug, item.filePath);
  }

  return items;
}
