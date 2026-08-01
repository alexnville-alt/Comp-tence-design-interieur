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
  checkRelationSymmetry,
  type AnyExerciseFrontmatter,
  type CardFrontmatter,
  type LibraryItemFrontmatter,
  type RelationType,
} from "@atelier/domain";
import { aiProvider } from "../src/lib/ai/provider";
import { ContentValidationError } from "../src/lib/content/frontmatter";
import { scanLibrary } from "../src/lib/content/library-registry";
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

const RELATION_FIELDS: { field: keyof LibraryItemFrontmatter; type: RelationType }[] = [
  { field: "pairsWith", type: "PAIRS_WITH" },
  { field: "avoidWith", type: "AVOID_WITH" },
  { field: "cheaperAlt", type: "CHEAPER_ALT" },
  { field: "premiumAlt", type: "PREMIUM_ALT" },
  { field: "sameFamily", type: "SAME_FAMILY" },
];

/** Texte soumis à la recherche par similarité (M7, ADR-0013) — mêmes champs que la colonne `searchVector` générée par PostgreSQL (packages/db/prisma/schema.prisma), pour que les deux mécanismes de recherche portent sur le même contenu. */
function embeddingTextOf(item: LibraryItemFrontmatter): string {
  return [
    item.name,
    item.summary,
    item.description,
    ...item.pros,
    ...item.cons,
    ...item.mistakes,
  ].join(" ");
}

/** Littéral pgvector (`[0.1,0.2,...]`) — Prisma ne sait pas écrire `Unsupported("vector(1024)")` directement. */
function pgvectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

async function syncLibrary(contentRoot: string): Promise<number> {
  const items = scanLibrary(contentRoot).map((entry) => entry.frontmatter);

  const symmetryErrors = checkRelationSymmetry(items);
  if (symmetryErrors.length > 0) {
    throw new Error(
      `Bibliothèque : relations incohérentes (docs/05 M7)\n${symmetryErrors.map((e) => `  • ${e}`).join("\n")}`,
    );
  }

  const idBySlug = new Map<string, string>();
  for (const item of items) {
    const data = {
      category: item.category,
      name: item.name,
      summary: item.summary,
      description: item.description,
      pros: item.pros,
      cons: item.cons,
      budgetTier: item.budgetTier,
      budgetNote: item.budgetNote ?? null,
      maintenance: item.maintenance,
      mistakes: item.mistakes,
      bestFor: item.bestFor,
      styles: item.styles,
      noWorksNeeded: item.noWorksNeeded,
      attributes: item.attributes,
    };
    const dbItem = await prisma.libraryItem.upsert({
      where: { slug: item.slug },
      update: data,
      create: { ...data, slug: item.slug },
    });
    idBySlug.set(item.slug, dbItem.id);
  }

  for (const item of items) {
    const fromId = idBySlug.get(item.slug)!;
    for (const { field, type } of RELATION_FIELDS) {
      for (const targetSlug of item[field] as string[]) {
        const toId = idBySlug.get(targetSlug)!;
        await prisma.libraryRelation.upsert({
          where: { fromId_toId_type: { fromId, toId, type } },
          update: {},
          create: { fromId, toId, type },
        });
      }
    }
  }

  // Un seul appel groupé plutôt qu'un par fiche : c'est l'unité de facturation
  // naturelle de l'API Voyage (ADR-0013), et l'adaptateur factice (dev, CI)
  // n'a de toute façon aucun coût réseau à amortir.
  if (items.length > 0) {
    const { embeddings } = await aiProvider.embed({
      texts: items.map(embeddingTextOf),
      inputType: "document",
    });
    for (const [index, item] of items.entries()) {
      const id = idBySlug.get(item.slug)!;
      const vector = pgvectorLiteral(embeddings[index]!);
      await prisma.$executeRaw`UPDATE "LibraryItem" SET embedding = ${vector}::vector WHERE id = ${id}`;
    }
  }

  return items.length;
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

  const libraryItemCount = await syncLibrary(contentRoot);

  console.warn(
    `✓ Contenu synchronisé : ${registry.levels.length} niveaux, ${chapterCount} chapitres, ` +
      `${lessonCount} leçons, ${exerciseCount} exercices, ${cardCount} cartes, ` +
      `${assessmentCount} évaluations, ${libraryItemCount} fiches bibliothèque.`,
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
