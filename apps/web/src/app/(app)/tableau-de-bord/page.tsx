import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@atelier/db";
import { GOAL_LABELS, LEVELS, getLevel } from "@atelier/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      goal: true,
      weeklyMinutes: true,
      startingLevel: true,
      totalXp: true,
      currentStreak: true,
    },
  });

  const startingLevel = getLevel(profile?.startingLevel ?? 1);
  const firstName = user.name?.split(" ")[0] ?? "";

  // La prochaine leçon est la première, dans l'ordre du parcours, que
  // l'apprenant n'a pas encore terminée — qu'il l'ait déjà commencée ou non.
  const nextLesson = await prisma.lesson.findFirst({
    where: {
      published: true,
      progress: { none: { userId: user.id, status: "COMPLETED" } },
    },
    orderBy: [
      { chapter: { level: { number: "asc" } } },
      { chapter: { number: "asc" } },
      { number: "asc" },
    ],
    include: { chapter: { include: { level: true } } },
  });
  const nextLessonProgress = nextLesson
    ? await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: nextLesson.id } },
        select: { status: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl">Bonjour {firstName}</h1>
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
          {profile?.totalXp ?? 0} XP · série {profile?.currentStreak ?? 0} j
        </p>
      </header>

      {params.bienvenue === "1" ? (
        <Alert tone="success" title="Votre compte est prêt">
          Nous vous avons positionné au niveau {profile?.startingLevel ?? 1}. Vous pourrez
          ajuster votre rythme à tout moment depuis votre profil.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Prochaine étape</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              Niveau {startingLevel?.number} · {startingLevel?.title}
            </p>
            <p className="mt-1 text-[var(--text)]">{startingLevel?.summary}</p>
          </div>

          {nextLesson ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--text-muted)]">
                  {nextLessonProgress?.status === "IN_PROGRESS"
                    ? "Reprendre"
                    : "À suivre"}{" "}
                  · {nextLesson.chapter.level.title}
                </p>
                <p className="mt-1 font-medium text-[var(--text)]">{nextLesson.title}</p>
                <p className="text-sm text-[var(--text-muted)]">{nextLesson.summary}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link
                    href={`/parcours/${nextLesson.chapter.level.slug}/${nextLesson.chapter.slug}/${nextLesson.slug}`}
                  >
                    {nextLessonProgress?.status === "IN_PROGRESS"
                      ? "Reprendre la leçon"
                      : "Commencer la leçon"}
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/parcours">Voir le parcours</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert tone="success" title="Vous êtes à jour">
                Aucune leçon publiée ne vous attend pour l'instant. De nouveaux niveaux
                arrivent progressivement.
              </Alert>
              <Button asChild variant="secondary">
                <Link href="/parcours">Voir le parcours</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Votre objectif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{GOAL_LABELS[profile?.goal ?? "WHOLE_HOME"]}</p>
            <p className="text-[var(--text-muted)]">
              {Math.round((profile?.weeklyMinutes ?? 150) / 6) / 10} h par semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le parcours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{LEVELS.length} niveaux, 4 phases</p>
            <p className="text-[var(--text-muted)]">
              Du vocabulaire de base au dossier de rénovation complet
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
