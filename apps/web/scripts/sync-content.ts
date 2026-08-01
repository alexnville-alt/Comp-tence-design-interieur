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
import {
  LEVELS,
  type AnyExerciseFrontmatter,
  type CardFrontmatter,
} from "@atelier/domain";
import { ContentValidationError } from "../src/lib/content/frontmatter";
import { scanContent } from "../src/lib/content/registry";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * `payload` porte l'exercice complet (y compris `slug`/`type`/`prompt`,
 * dupliqués avec leurs colonnes propres) plutôt qu'un sous-ensemble de
 * champs spécifiques au type : `gradeExercise` (packages/domain) attend un
 * `ExerciseFrontmatter` entier, et le reconstruire à partir de colonnes
 * éparpillées serait plus fragile qu'une désérialisation directe suivie
 * d'une revalidation Zod côté lecture. `AnyExerciseFrontmatter` (M5) inclut
 * `OPEN_CASE` en plus des 7 types auto-corrigés — cette fonction n'a besoin
 * d'aucun champ propre à un type précis, donc rien d'autre ne change ici.
 */
async function upsertExercise(
  exercise: AnyExerciseFrontmatter,
  order: number,
  container:
    | { lessonId: string; assessmentId?: never }
    | { assessmentId: string; lessonId?: never },
): Promise<void> {
  const data = {
    type: exercise.type,
    prompt: exercise.prompt,
    payload: exercise,
    maxScore: exercise.maxScore,
    xpReward: exercise.xpReward,
    order,
  };

  if ("lessonId" in container && container.lessonId) {
    await prisma.exercise.upsert({
      where: { lessonId_slug: { lessonId: container.lessonId, slug: exercise.slug } },
      update: data,
      create: { ...data, slug: exercise.slug, lessonId: container.lessonId },
    });
  } else if ("assessmentId" in container && container.assessmentId) {
    await prisma.exercise.upsert({
      where: {
        assessmentId_slug: { assessmentId: container.assessmentId, slug: exercise.slug },
      },
      update: data,
      create: { ...data, slug: exercise.slug, assessmentId: container.assessmentId },
    });
  }
}

async function upsertCard(card: CardFrontmatter, lessonId: string): Promise<void> {
  await prisma.card.upsert({
    where: { slug: card.slug },
    update: {
      lessonId,
      front: card.front,
      back: card.back,
      hint: card.hint ?? null,
      topic: card.topic,
    },
    create: {
      slug: card.slug,
      lessonId,
      front: card.front,
      back: card.back,
      hint: card.hint ?? null,
      topic: card.topic,
    },
  });
}

async function main() {
  const contentRoot = join(__dirname, "..", "content");
  const registry = scanContent(contentRoot);

  let chapterCount = 0;
  let lessonCount = 0;
  let exerciseCount = 0;
  let cardCount = 0;
  let assessmentCount = 0;

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
        ...(level.assessment ? { passingScore: level.assessment.passingScore } : {}),
      },
      create: {
        number: levelMeta.number,
        slug: levelMeta.slug,
        title: levelMeta.title,
        summary: levelMeta.summary,
        phase: levelMeta.phase,
        estimatedMinutes: levelMeta.estimatedMinutes,
        requiresLevel: levelMeta.requiresLevel,
        ...(level.assessment ? { passingScore: level.assessment.passingScore } : {}),
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
        const dbLesson = await prisma.lesson.upsert({
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

        for (const [index, exercise] of lesson.frontmatter.exercises.entries()) {
          exerciseCount++;
          await upsertExercise(exercise, index, { lessonId: dbLesson.id });
        }
        for (const card of lesson.frontmatter.cards) {
          cardCount++;
          await upsertCard(card, dbLesson.id);
        }
      }
    }

    if (level.assessment) {
      assessmentCount++;
      const dbAssessment = await prisma.assessment.upsert({
        where: { levelId: dbLevel.id },
        update: {
          title: level.assessment.title,
          passingScore: level.assessment.passingScore,
        },
        create: {
          levelId: dbLevel.id,
          title: level.assessment.title,
          passingScore: level.assessment.passingScore,
        },
      });

      for (const [index, exercise] of level.assessment.exercises.entries()) {
        exerciseCount++;
        await upsertExercise(exercise, index, { assessmentId: dbAssessment.id });
      }
    }
  }

  console.warn(
    `✓ Contenu synchronisé : ${registry.levels.length} niveaux, ${chapterCount} chapitres, ` +
      `${lessonCount} leçons, ${exerciseCount} exercices, ${cardCount} cartes, ` +
      `${assessmentCount} évaluations.`,
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
