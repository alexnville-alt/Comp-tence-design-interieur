import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LEVELS } from "@atelier/domain";
import { scanContent } from "./registry";

/**
 * Ces tests construisent des arborescences de contenu jetables plutôt que de
 * dépendre du contenu réel : ils vérifient que `scanContent` détecte
 * correctement chaque catégorie d'erreur d'auteur, indépendamment de ce qui
 * est actuellement publié. Le contenu réel est, lui, vérifié séparément dans
 * `content-reel.test.ts` — cette séparation permet de garder des cas
 * d'erreur précis ici sans polluer les leçons publiées avec des fixtures.
 */

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function makeContentRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "atelier-content-"));
  tempDirs.push(dir);
  return dir;
}

const LEVEL_1_SLUG = LEVELS[0]!.slug;

function writeChapter(
  root: string,
  levelSlug: string,
  chapterDirName: string,
  meta: { number: number; slug: string; title: string },
): string {
  const dir = join(root, "niveaux", levelSlug, chapterDirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "_chapitre.yaml"),
    `number: ${meta.number}\nslug: ${meta.slug}\ntitle: "${meta.title}"\n`,
  );
  return dir;
}

function writeLesson(
  chapterDir: string,
  fileName: string,
  frontmatter: {
    slug: string;
    number: number;
    title: string;
    summary: string;
    minutes: number;
  },
  body = `<Texte n={1} titre="Introduction">Contenu de démonstration.</Texte>`,
): void {
  const content = [
    "---",
    `slug: ${frontmatter.slug}`,
    `number: ${frontmatter.number}`,
    `title: "${frontmatter.title}"`,
    `summary: "${frontmatter.summary}"`,
    `minutes: ${frontmatter.minutes}`,
    "---",
    "",
    body,
    "",
  ].join("\n");
  writeFileSync(join(chapterDir, fileName), content);
}

describe("scanContent — cas valide", () => {
  it("retourne les 15 niveaux, avec des chapitres vides pour ceux sans contenu", () => {
    const root = makeContentRoot();
    const registry = scanContent(root);
    expect(registry.levels).toHaveLength(15);
    expect(registry.levels.every((l) => l.chapters.length === 0)).toBe(true);
  });

  it("lit un chapitre et une leçon valides", () => {
    const root = makeContentRoot();
    const chapterDir = writeChapter(root, LEVEL_1_SLUG, "01-notions", {
      number: 1,
      slug: "notions",
      title: "Notions",
    });
    writeLesson(chapterDir, "01-premiere-lecon.mdx", {
      slug: "premiere-lecon",
      number: 1,
      title: "Première leçon",
      summary: "Un résumé.",
      minutes: 5,
    });

    const registry = scanContent(root);
    const level1 = registry.levels.find((l) => l.slug === LEVEL_1_SLUG)!;
    expect(level1.chapters).toHaveLength(1);
    expect(level1.chapters[0]!.lessons).toHaveLength(1);
    expect(level1.chapters[0]!.lessons[0]!.frontmatter.title).toBe("Première leçon");
    expect(level1.chapters[0]!.lessons[0]!.blockCount).toBe(1);
    expect(level1.chapters[0]!.lessons[0]!.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("scanContent — erreurs détectées", () => {
  it("rejette un dossier de niveau dont le slug est inconnu", () => {
    const root = makeContentRoot();
    mkdirSync(join(root, "niveaux", "niveau-qui-nexiste-pas"), { recursive: true });
    expect(() => scanContent(root)).toThrow(/ne correspond à aucun niveau connu/);
  });

  it("rejette un dossier de chapitre sans préfixe numérique", () => {
    const root = makeContentRoot();
    mkdirSync(join(root, "niveaux", LEVEL_1_SLUG, "notions-sans-prefixe"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "niveaux", LEVEL_1_SLUG, "notions-sans-prefixe", "_chapitre.yaml"),
      "number: 1\nslug: notions\ntitle: Notions\n",
    );
    expect(() => scanContent(root)).toThrow(/préfixe numérique/);
  });

  it("rejette un chapitre sans _chapitre.yaml", () => {
    const root = makeContentRoot();
    mkdirSync(join(root, "niveaux", LEVEL_1_SLUG, "01-notions"), { recursive: true });
    expect(() => scanContent(root)).toThrow(/_chapitre\.yaml/);
  });

  it("rejette un décalage entre le préfixe du dossier et number du yaml", () => {
    const root = makeContentRoot();
    const dir = join(root, "niveaux", LEVEL_1_SLUG, "02-notions");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_chapitre.yaml"),
      "number: 1\nslug: notions\ntitle: Notions\n",
    );
    expect(() => scanContent(root)).toThrow(/ne correspond pas au préfixe du dossier/);
  });

  it("rejette une numérotation de chapitres non contiguë", () => {
    const root = makeContentRoot();
    writeChapter(root, LEVEL_1_SLUG, "01-un", { number: 1, slug: "un", title: "Un" });
    writeChapter(root, LEVEL_1_SLUG, "03-trois", {
      number: 3,
      slug: "trois",
      title: "Trois",
    });
    expect(() => scanContent(root)).toThrow(/numérotation non contiguë/);
  });

  it("rejette un frontmatter de leçon invalide avec le chemin du fichier", () => {
    const root = makeContentRoot();
    const chapterDir = writeChapter(root, LEVEL_1_SLUG, "01-notions", {
      number: 1,
      slug: "notions",
      title: "Notions",
    });
    writeFileSync(
      join(chapterDir, "01-invalide.mdx"),
      [
        "---",
        "slug: invalide",
        "number: 1",
        "title: ''",
        "summary: ''",
        "minutes: 5",
        "---",
        "",
      ].join("\n"),
    );
    expect(() => scanContent(root)).toThrow(/01-invalide\.mdx/);
    expect(() => scanContent(root)).toThrow(/frontmatter invalide/);
  });

  it("rejette un décalage entre le préfixe du fichier et number du frontmatter", () => {
    const root = makeContentRoot();
    const chapterDir = writeChapter(root, LEVEL_1_SLUG, "01-notions", {
      number: 1,
      slug: "notions",
      title: "Notions",
    });
    writeLesson(chapterDir, "02-decalee.mdx", {
      slug: "decalee",
      number: 1,
      title: "Titre",
      summary: "Résumé.",
      minutes: 5,
    });
    expect(() => scanContent(root)).toThrow(/ne correspond pas au préfixe du fichier/);
  });

  it("rejette une numérotation de blocs invalide, avec le chemin du fichier", () => {
    const root = makeContentRoot();
    const chapterDir = writeChapter(root, LEVEL_1_SLUG, "01-notions", {
      number: 1,
      slug: "notions",
      title: "Notions",
    });
    writeLesson(
      chapterDir,
      "01-blocs-casses.mdx",
      { slug: "blocs-casses", number: 1, title: "Titre", summary: "Résumé.", minutes: 5 },
      `<Texte n={1}>A</Texte>\n<Texte n={3}>B</Texte>`,
    );
    expect(() => scanContent(root)).toThrow(/01-blocs-casses\.mdx/);
    expect(() => scanContent(root)).toThrow(/numérotation de bloc incorrecte/);
  });

  it("rejette deux leçons avec le même slug, même dans des chapitres différents", () => {
    const root = makeContentRoot();
    const chapter1 = writeChapter(root, LEVEL_1_SLUG, "01-un", {
      number: 1,
      slug: "un",
      title: "Un",
    });
    const chapter2 = writeChapter(root, LEVEL_1_SLUG, "02-deux", {
      number: 2,
      slug: "deux",
      title: "Deux",
    });
    writeLesson(chapter1, "01-doublon.mdx", {
      slug: "meme-slug",
      number: 1,
      title: "A",
      summary: "R.",
      minutes: 5,
    });
    writeLesson(chapter2, "01-doublon.mdx", {
      slug: "meme-slug",
      number: 1,
      title: "B",
      summary: "R.",
      minutes: 5,
    });
    expect(() => scanContent(root)).toThrow(/Slug de leçon en double/);
  });

  it("rejette deux chapitres avec le même slug dans un même niveau", () => {
    const root = makeContentRoot();
    writeChapter(root, LEVEL_1_SLUG, "01-un", {
      number: 1,
      slug: "meme-slug",
      title: "Un",
    });
    writeChapter(root, LEVEL_1_SLUG, "02-deux", {
      number: 2,
      slug: "meme-slug",
      title: "Deux",
    });
    expect(() => scanContent(root)).toThrow(/Slug de chapitre en double/);
  });
});
