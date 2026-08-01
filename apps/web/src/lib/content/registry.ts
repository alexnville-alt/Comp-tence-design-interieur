import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ChapterMetaSchema,
  LEVELS,
  LessonFrontmatterSchema,
  type ChapterMeta,
  type LessonFrontmatter,
} from "@atelier/domain";
import yaml from "js-yaml";

import { ContentValidationError, parseFrontmatter } from "./frontmatter";
import { formatBlockNumberingError, validateBlockNumbering } from "./blocks";

/**
 * Lecture et validation de l'arborescence de contenu (ADR-0010).
 *
 * Cette fonction est le cœur testable de la synchronisation : elle ne touche
 * jamais la base de données (voir `scripts/sync-content.ts`, qui l'appelle
 * puis fait les `upsert`), donc les mêmes tests s'exécutent sans PostgreSQL —
 * et, comme elle est appliquée au contenu **réel** du dépôt, l'exécuter dans
 * les tests vaut aussi comme vérification permanente que les leçons publiées
 * restent bien formées.
 *
 * Attendu sur le disque :
 * ```
 * content/niveaux/<slug-de-niveau>/<NN-slug-de-chapitre>/_chapitre.yaml
 * content/niveaux/<slug-de-niveau>/<NN-slug-de-chapitre>/<NN-slug-de-lecon>.mdx
 * ```
 * Le préfixe numérique des dossiers/fichiers sert à l'ordre de lecture pour
 * un humain qui parcourt le dépôt ; il doit toujours être cohérent avec le
 * numéro déclaré dans `_chapitre.yaml` / le frontmatter de la leçon — une
 * incohérence est un signal d'erreur, pas une variante tolérée.
 */

export interface ContentLesson {
  filePath: string;
  frontmatter: LessonFrontmatter;
  /** Corps MDX brut (hors frontmatter), à compiler au moment du rendu. */
  content: string;
  blockCount: number;
  contentHash: string;
}

export interface ContentChapter {
  dirPath: string;
  meta: ChapterMeta;
  lessons: ContentLesson[];
}

export interface ContentLevel {
  /** Métadonnée structurelle — `@atelier/domain` reste la source de vérité. */
  slug: string;
  number: number;
  chapters: ContentChapter[];
}

export interface ContentRegistry {
  /** Un élément par niveau des 15 définis dans `@atelier/domain`, dans l'ordre. */
  levels: ContentLevel[];
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Extrait le préfixe numérique d'un nom de dossier/fichier `NN-le-reste`. */
function leadingNumber(name: string, context: string): number {
  const match = /^(\d+)-/.exec(name);
  if (!match) {
    throw new Error(
      `${context} : le nom « ${name} » doit commencer par un préfixe numérique ` +
        `suivi d'un tiret (ex. « 01-notions-generales »).`,
    );
  }
  return Number(match[1]);
}

/** Vérifie qu'une liste de numéros est exactement `1, 2, 3, … , n`, dans l'ordre. */
function assertContiguous(numbers: number[], context: string): void {
  numbers.forEach((n, i) => {
    const expected = i + 1;
    if (n !== expected) {
      throw new Error(
        `${context} : numérotation non contiguë — attendu ${expected}, trouvé ${n}. ` +
          `La séquence complète est [${numbers.join(", ")}].`,
      );
    }
  });
}

function readChapter(
  levelSlug: string,
  chapterDirName: string,
  chapterDirPath: string,
): ContentChapter {
  const dirNumber = leadingNumber(
    chapterDirName,
    `niveau « ${levelSlug} », dossier de chapitre « ${chapterDirName} »`,
  );

  const metaPath = join(chapterDirPath, "_chapitre.yaml");
  if (!existsSync(metaPath)) {
    throw new Error(
      `niveau « ${levelSlug} » : le dossier « ${chapterDirName} » ne contient pas ` +
        `de fichier _chapitre.yaml (métadonnée de chapitre requise — voir ADR-0010).`,
    );
  }

  const rawMeta = yaml.load(readFileSync(metaPath, "utf8"));
  const parsedMeta = ChapterMetaSchema.safeParse(rawMeta);
  if (!parsedMeta.success) {
    throw new ContentValidationError(
      metaPath,
      `_chapitre.yaml invalide :\n${parsedMeta.error.issues
        .map((issue) => `  • ${issue.path.join(".") || "(racine)"} : ${issue.message}`)
        .join("\n")}`,
    );
  }
  const meta = parsedMeta.data;

  if (meta.number !== dirNumber) {
    throw new Error(
      `${metaPath} : le champ number (${meta.number}) ne correspond pas au préfixe ` +
        `du dossier « ${chapterDirName} » (${dirNumber}).`,
    );
  }

  const lessonFiles = readdirSync(chapterDirPath)
    .filter((name) => name.endsWith(".mdx"))
    .sort();

  const lessons = lessonFiles.map((fileName) => {
    const filePath = join(chapterDirPath, fileName);
    const fileNumber = leadingNumber(
      fileName,
      `chapitre « ${chapterDirName} », fichier « ${fileName} »`,
    );
    const raw = readFileSync(filePath, "utf8");

    const { data: frontmatter, content } = parseFrontmatter(
      filePath,
      raw,
      LessonFrontmatterSchema,
    );

    if (frontmatter.number !== fileNumber) {
      throw new Error(
        `${filePath} : le champ number du frontmatter (${frontmatter.number}) ne ` +
          `correspond pas au préfixe du fichier (${fileNumber}).`,
      );
    }

    const numbering = validateBlockNumbering(content);
    if (!numbering.valid) {
      throw new ContentValidationError(
        filePath,
        formatBlockNumberingError(numbering.error!),
      );
    }

    return {
      filePath,
      frontmatter,
      content,
      blockCount: numbering.blockCount,
      contentHash: sha256(raw),
    } satisfies ContentLesson;
  });

  assertContiguous(
    lessons.map((l) => l.frontmatter.number),
    `niveau « ${levelSlug} », chapitre « ${meta.slug} »`,
  );

  return { dirPath: chapterDirPath, meta, lessons };
}

/**
 * Scanne `contentRoot` et retourne un modèle validé, ou lève une erreur
 * décrivant précisément le premier problème rencontré (fichier concerné,
 * champ en cause).
 */
export function scanContent(contentRoot: string): ContentRegistry {
  const niveauxRoot = join(contentRoot, "niveaux");
  const knownSlugs = new Set(LEVELS.map((l) => l.slug));

  const existingLevelDirs = existsSync(niveauxRoot)
    ? readdirSync(niveauxRoot).filter((name) =>
        statSync(join(niveauxRoot, name)).isDirectory(),
      )
    : [];

  for (const dirName of existingLevelDirs) {
    if (!knownSlugs.has(dirName)) {
      throw new Error(
        `content/niveaux/${dirName} : ce nom ne correspond à aucun niveau connu de ` +
          `@atelier/domain. Slugs valides : ${[...knownSlugs].join(", ")}.`,
      );
    }
  }

  const levels: ContentLevel[] = LEVELS.map((level) => {
    const levelDir = join(niveauxRoot, level.slug);
    if (!existsSync(levelDir)) {
      // Pas encore de contenu pour ce niveau — légitime avant M11 : la
      // structure des 15 niveaux existe toujours (LEARN-01), le contenu
      // arrive par lot.
      return { slug: level.slug, number: level.number, chapters: [] };
    }

    const chapterDirs = readdirSync(levelDir)
      .filter((name) => statSync(join(levelDir, name)).isDirectory())
      .sort();

    const chapters = chapterDirs.map((dirName) =>
      readChapter(level.slug, dirName, join(levelDir, dirName)),
    );

    assertContiguous(
      chapters.map((c) => c.meta.number),
      `niveau « ${level.slug} »`,
    );

    return { slug: level.slug, number: level.number, chapters };
  });

  assertGlobalUniqueness(levels);

  return { levels };
}

/**
 * `Lesson.slug` et `Chapter.slug` (par niveau) sont uniques en base — un
 * conflit doit être détecté ici, avec les deux fichiers en cause, plutôt que
 * de remonter comme une contrainte SQL violée sans contexte.
 */
function assertGlobalUniqueness(levels: ContentLevel[]): void {
  const lessonSlugs = new Map<string, string>(); // slug -> filePath
  for (const level of levels) {
    const chapterSlugs = new Map<string, string>(); // slug -> dirPath, par niveau
    for (const chapter of level.chapters) {
      const existingChapter = chapterSlugs.get(chapter.meta.slug);
      if (existingChapter) {
        throw new Error(
          `Slug de chapitre en double dans le niveau « ${level.slug} » : ` +
            `« ${chapter.meta.slug} » utilisé par ${existingChapter} et ${chapter.dirPath}.`,
        );
      }
      chapterSlugs.set(chapter.meta.slug, chapter.dirPath);

      for (const lesson of chapter.lessons) {
        const existingLesson = lessonSlugs.get(lesson.frontmatter.slug);
        if (existingLesson) {
          throw new Error(
            `Slug de leçon en double : « ${lesson.frontmatter.slug} » utilisé par ` +
              `${existingLesson} et ${lesson.filePath}. Les slugs de leçon sont ` +
              `globalement uniques (liens directs).`,
          );
        }
        lessonSlugs.set(lesson.frontmatter.slug, lesson.filePath);
      }
    }
  }
}
