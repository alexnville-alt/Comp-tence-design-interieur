import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { prisma } from "@atelier/db";
import { isLevelUnlocked } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niveau: string }>;
}): Promise<Metadata> {
  const { niveau } = await params;
  const level = await prisma.level.findUnique({
    where: { slug: niveau },
    select: { title: true },
  });
  return { title: level?.title ?? "Niveau" };
}

export default async function NiveauPage({
  params,
}: {
  params: Promise<{ niveau: string }>;
}) {
  const user = await requireOnboardedUser();
  const { niveau } = await params;

  const level = await prisma.level.findUnique({
    where: { slug: niveau },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: { lessons: { where: { published: true }, orderBy: { number: "asc" } } },
      },
      assessment: true,
    },
  });
  if (!level) notFound();

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { startingLevel: true },
  });
  const startingLevel = profile?.startingLevel ?? 1;
  const completedLevelProgress = await prisma.levelProgress.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    select: { level: { select: { number: true } } },
  });
  const completedLevels = completedLevelProgress.map((p) => p.level.number);
  const unlocked = isLevelUnlocked(level.number, completedLevels, startingLevel);

  const ownProgress = await prisma.levelProgress.findUnique({
    where: { userId_levelId: { userId: user.id, levelId: level.id } },
    select: { completedAt: true, bestScore: true },
  });

  const lessonIds = level.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => lesson.id),
  );
  const progressRows = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { userId: user.id, lessonId: { in: lessonIds } },
        select: { lessonId: true, status: true },
      })
    : [];
  const statusByLesson = new Map(progressRows.map((row) => [row.lessonId, row.status]));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
          Niveau {level.number}
        </p>
        <h1 className="text-3xl">{level.title}</h1>
        <p className="text-[var(--text-muted)]">{level.summary}</p>
      </header>

      {!unlocked ? (
        <Alert tone="info" title="Niveau verrouillé">
          Terminez le niveau précédent pour y accéder.
        </Alert>
      ) : level.chapters.length === 0 ? (
        <Alert tone="info" title="Contenu à venir">
          Les leçons de ce niveau ne sont pas encore publiées.
        </Alert>
      ) : (
        level.chapters.map((chapter) => (
          <section key={chapter.id} className="space-y-3">
            <h2 className="text-xl">{chapter.title}</h2>
            <ul className="space-y-2">
              {chapter.lessons.map((lesson) => {
                const status = statusByLesson.get(lesson.id) ?? "NOT_STARTED";
                const Icon =
                  status === "COMPLETED"
                    ? CheckCircle2
                    : status === "IN_PROGRESS"
                      ? PlayCircle
                      : Circle;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/parcours/${level.slug}/${chapter.slug}/${lesson.slug}`}
                      className="flex items-center gap-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <Icon
                        className={cn(
                          "size-5 shrink-0",
                          status === "COMPLETED"
                            ? "text-[var(--success)]"
                            : status === "IN_PROGRESS"
                              ? "text-[var(--accent)]"
                              : "text-[var(--text-muted)]",
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {lesson.summary}
                        </p>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                        {lesson.minutes} min
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {unlocked && level.assessment ? (
        <section className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
          <h2 className="text-xl">{level.assessment.title}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Seuil de réussite : {level.assessment.passingScore}/100.
            {ownProgress?.completedAt
              ? ` Niveau validé — meilleur score ${ownProgress.bestScore}/100.`
              : ownProgress?.bestScore != null
                ? ` Dernier score : ${ownProgress.bestScore}/100. Un échec ne verrouille rien.`
                : ""}
          </p>
          <Button asChild variant={ownProgress?.completedAt ? "secondary" : "primary"}>
            <Link href={`/parcours/${level.slug}/evaluation`}>
              {ownProgress?.completedAt ? "Repasser l'évaluation" : "Passer l'évaluation"}
            </Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
