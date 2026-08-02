import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ZodType, z } from "zod";
import {
  ChallengeFrontmatterSchema,
  FamousInteriorFrontmatterSchema,
  MilestoneProjectFrontmatterSchema,
  type ChallengeFrontmatter,
  type FamousInteriorFrontmatter,
  type MilestoneProjectFrontmatter,
} from "@atelier/domain";
import { ContentValidationError, parseFrontmatter } from "./frontmatter";

/**
 * Lecture et validation du contenu transverse (docs/06 §4, M11) : intérieurs
 * célèbres, projets jalons, défis hebdomadaires. Même principe que
 * `library-registry.ts` — une fonction pure par type, testable sans base de
 * données, appliquée au contenu **réel** du dépôt.
 *
 * Attendu sur le disque, un dossier plat par type (pas de sous-catégories,
 * à la différence de la bibliothèque, M7) :
 * ```
 * content/interieurs-celebres/<slug>.mdx
 * content/projets-jalons/<slug>.mdx
 * content/defis/<slug>.mdx
 * ```
 * Le corps MDX n'est exploité pour aucun des trois types — tout le contenu
 * structuré vit dans le frontmatter, même choix que `LibraryItem` (M7).
 */

function scanFlatDirectory<S extends ZodType<{ slug: string }>>(
  contentRoot: string,
  folderName: string,
  schema: S,
): { filePath: string; frontmatter: z.output<S> }[] {
  const dirPath = join(contentRoot, folderName);
  const files = readdirSync(dirPath).filter((f) => f.endsWith(".mdx"));

  const items = files.map((file) => {
    const filePath = join(dirPath, file);
    const raw = readFileSync(filePath, "utf-8");
    const { data } = parseFrontmatter(filePath, raw, schema);
    return { filePath, frontmatter: data };
  });

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

export function scanFamousInteriors(
  contentRoot: string,
): { filePath: string; frontmatter: FamousInteriorFrontmatter }[] {
  return scanFlatDirectory(
    contentRoot,
    "interieurs-celebres",
    FamousInteriorFrontmatterSchema,
  );
}

export function scanMilestoneProjects(
  contentRoot: string,
): { filePath: string; frontmatter: MilestoneProjectFrontmatter }[] {
  const items = scanFlatDirectory(
    contentRoot,
    "projets-jalons",
    MilestoneProjectFrontmatterSchema,
  );

  const seenPhases = new Map<number, string>();
  for (const item of items) {
    const previous = seenPhases.get(item.frontmatter.phase);
    if (previous) {
      throw new ContentValidationError(
        item.filePath,
        `phase ${item.frontmatter.phase} déjà couverte par ${previous} — une seule phase par projet jalon (docs/06 §2).`,
      );
    }
    seenPhases.set(item.frontmatter.phase, item.filePath);
  }

  return items;
}

export function scanChallenges(
  contentRoot: string,
): { filePath: string; frontmatter: ChallengeFrontmatter }[] {
  const items = scanFlatDirectory(contentRoot, "defis", ChallengeFrontmatterSchema);

  const seenWeeks = new Map<number, string>();
  for (const item of items) {
    const previous = seenWeeks.get(item.frontmatter.weekIndex);
    if (previous) {
      throw new ContentValidationError(
        item.filePath,
        `weekIndex ${item.frontmatter.weekIndex} déjà utilisé par ${previous}.`,
      );
    }
    seenWeeks.set(item.frontmatter.weekIndex, item.filePath);
  }

  return items;
}
