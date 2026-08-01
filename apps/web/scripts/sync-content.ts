/**
 * Synchronise le contenu MDX (Git, ADR-0010) vers la base de données.
 *
 * Idempotent : chaque niveau/chapitre/leçon est publié par `upsert` sur sa
 * clé naturelle (slug), donc rejouable sans dupliquer quoi que ce soit — le
 * même mécanisme que `prisma/seed.ts`. C'est ce script que `pnpm db:seed`
 * enchaîne après le seed de base, et qui bloque la CI (docs/05 M2, critère
 * d'acceptation : « ajouter une leçon = créer un .mdx + lancer le seed, rien
 * d'autre »).
 *
 * `scanContent` fait toute la validation (frontmatter, numérotation des
 * blocs, unicité des slugs) et lève une erreur exploitable au premier
 * problème rencontré : ce script n'a plus qu'à la laisser remonter avec un
 * code de sortie non nul.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@atelier/db";
import { LEVELS } from "@atelier/domain";
import { ContentValidationError } from "../src/lib/content/frontmatter";
import { scanContent } from "../src/lib/content/registry";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const contentRoot = join(__dirname, "..", "content");
  const registry = scanContent(contentRoot);

  let chapterCount = 0;
  let lessonCount = 0;

  for (const level of registry.levels) {
    const levelMeta = LEVELS.find((l) => l.slug === level.slug);
    if (!levelMeta) {
      // Ne peut pas arriver : `registry.levels` est dérivé de `LEVELS`.
      throw new Error(`Niveau « ${level.slug} » absent de @atelier/domain.`);
    }

    const dbLevel = await prisma.level.upsert({
      where: { slug: levelMeta.slug },
      update: {
        number: levelMeta.number,
        title: levelMeta.title,
        summary: levelMeta.summary,
        phase: levelMeta.phase,
        estimatedMinutes: levelMeta.estimatedMinutes,
        requiresLevel: levelMeta.requiresLevel,
      },
      create: {
        number: levelMeta.number,
        slug: levelMeta.slug,
        title: levelMeta.title,
        summary: levelMeta.summary,
        phase: levelMeta.phase,
        estimatedMinutes: levelMeta.estimatedMinutes,
        requiresLevel: levelMeta.requiresLevel,
      },
    });

    for (const chapter of level.chapters) {
      chapterCount++;
      const dbChapter = await prisma.chapter.upsert({
        where: { levelId_slug: { levelId: dbLevel.id, slug: chapter.meta.slug } },
        update: { number: chapter.meta.number, title: chapter.meta.title },
        create: {
          levelId: dbLevel.id,
          number: chapter.meta.number,
          slug: chapter.meta.slug,
          title: chapter.meta.title,
        },
      });

      for (const lesson of chapter.lessons) {
        lessonCount++;
        await prisma.lesson.upsert({
          where: { slug: lesson.frontmatter.slug },
          update: {
            chapterId: dbChapter.id,
            number: lesson.frontmatter.number,
            title: lesson.frontmatter.title,
            summary: lesson.frontmatter.summary,
            minutes: lesson.frontmatter.minutes,
            xpReward: lesson.frontmatter.xpReward,
            blockCount: lesson.blockCount,
            contentHash: lesson.contentHash,
            videoUrl: lesson.frontmatter.videoUrl ?? null,
            published: lesson.frontmatter.published,
          },
          create: {
            chapterId: dbChapter.id,
            number: lesson.frontmatter.number,
            slug: lesson.frontmatter.slug,
            title: lesson.frontmatter.title,
            summary: lesson.frontmatter.summary,
            minutes: lesson.frontmatter.minutes,
            xpReward: lesson.frontmatter.xpReward,
            blockCount: lesson.blockCount,
            contentHash: lesson.contentHash,
            videoUrl: lesson.frontmatter.videoUrl ?? null,
            published: lesson.frontmatter.published,
          },
        });
      }
    }
  }

  console.warn(
    `✓ Contenu synchronisé : ${registry.levels.length} niveaux, ${chapterCount} chapitres, ${lessonCount} leçons.`,
  );
}

main()
  .catch((error: unknown) => {
    if (error instanceof ContentValidationError) {
      console.error(`✗ Contenu invalide\n${error.message}`);
    } else {
      console.error("✗ Échec de la synchronisation du contenu :", error);
    }
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
