import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";
import { LessonContent } from "@/lib/content/compile";
import { getContentRegistry } from "@/lib/content/get-registry";
import { LessonProgressTracker } from "@/features/learning/lesson-progress-tracker";
import { ExerciseBlock } from "@/features/exercises/exercise-block";
import { ChatPanel } from "@/features/ai/chat-panel";
import { HeartbeatTracker } from "@/features/progression/heartbeat-tracker";

async function loadLesson(niveau: string, chapitre: string, lecon: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lecon },
    include: {
      chapter: { include: { level: true } },
      exercises: { orderBy: { order: "asc" } },
    },
  });
  if (
    !lesson ||
    !lesson.published ||
    lesson.chapter.slug !== chapitre ||
    lesson.chapter.level.slug !== niveau
  ) {
    return null;
  }
  return lesson;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niveau: string; chapitre: string; lecon: string }>;
}): Promise<Metadata> {
  const { niveau, chapitre, lecon } = await params;
  const lesson = await loadLesson(niveau, chapitre, lecon);
  return { title: lesson?.title ?? "Leçon" };
}

export default async function LeconPage({
  params,
}: {
  params: Promise<{ niveau: string; chapitre: string; lecon: string }>;
}) {
  const user = await requireOnboardedUser();
  const { niveau, chapitre, lecon } = await params;

  const lesson = await loadLesson(niveau, chapitre, lecon);
  if (!lesson) notFound();

  const registry = getContentRegistry();
  const contentLesson = registry.levels
    .flatMap((level) => level.chapters)
    .flatMap((chapter) => chapter.lessons)
    .find((entry) => entry.frontmatter.slug === lecon);
  if (!contentLesson) notFound();

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    select: { blockIndex: true, status: true },
  });

  // Leçon suivante dans l'ordre strict du parcours (pas la prochaine leçon
  // incomplète — cette dernière est le rôle du tableau de bord, pas d'un
  // bouton « continuer » affiché après avoir terminé celle-ci). Bornée au
  // niveau courant : au-delà de son dernier chapitre, l'étape suivante est
  // l'évaluation de niveau, pas un saut direct au niveau suivant.
  const nextLesson = await prisma.lesson.findFirst({
    where: {
      published: true,
      chapter: { levelId: lesson.chapter.levelId },
      OR: [
        { chapterId: lesson.chapterId, number: { gt: lesson.number } },
        { chapter: { number: { gt: lesson.chapter.number } } },
      ],
    },
    orderBy: [{ chapter: { number: "asc" } }, { number: "asc" }],
    select: { slug: true, chapter: { select: { slug: true } } },
  });
  const next = nextLesson
    ? {
        href: `/parcours/${niveau}/${nextLesson.chapter.slug}/${nextLesson.slug}`,
        label: "Leçon suivante",
      }
    : { href: `/parcours/${niveau}/evaluation`, label: "Passer l'évaluation de niveau" };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
          {lesson.chapter.level.title} · {lesson.chapter.title}
        </p>
        <h1 className="text-3xl">{lesson.title}</h1>
        <p className="text-[var(--text-muted)]">
          {lesson.summary} · {lesson.minutes} min
        </p>
      </header>

      <HeartbeatTracker context={`lesson:${lesson.id}`} />
      <LessonProgressTracker
        lessonId={lesson.id}
        blockCount={lesson.blockCount}
        initialBlockIndex={progress?.blockIndex ?? 0}
        initialCompleted={progress?.status === "COMPLETED"}
        nextHref={next.href}
        nextLabel={next.label}
      />

      <div className="space-y-8">
        <LessonContent content={contentLesson.content} videoUrl={lesson.videoUrl} />
      </div>

      <ChatPanel lessonId={lesson.id} />

      {lesson.exercises.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl">Exercices</h2>
          {lesson.exercises.map((exercise) => (
            <ExerciseBlock key={exercise.id} exercise={exercise} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
