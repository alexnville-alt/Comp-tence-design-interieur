import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Snowflake } from "lucide-react";
import { prisma } from "@atelier/db";
import { GOAL_LABELS, getLevel } from "@atelier/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireOnboardedUser } from "@/lib/auth";
import { getDashboardData } from "@/features/progression/data";
import { getRecommendations } from "@/features/progression/recommendations";
import { BadgeIcon } from "@/features/progression/badge-icon";

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
    select: { goal: true, startingLevel: true },
  });

  const [dashboard, recommendations] = await Promise.all([
    getDashboardData(user.id),
    getRecommendations(user.id),
  ]);

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
          Niveau {dashboard.userLevel.level} · {dashboard.totalXp} XP · série{" "}
          {dashboard.currentStreak} j
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

      {recommendations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommandé pour vous</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec) => (
                <li key={rec.href + rec.label}>
                  <Link
                    href={rec.href}
                    className="block rounded-[var(--radius-atelier)] border border-[var(--border)] p-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--border-strong)]"
                  >
                    {rec.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Niveau {dashboard.userLevel.level}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProgressBar
              value={dashboard.userLevel.xpIntoLevel}
              max={dashboard.userLevel.xpForNextLevel || 1}
              label={`Progression vers le niveau ${dashboard.userLevel.level + 1}`}
            />
            <p className="text-[var(--text-muted)]">
              {dashboard.userLevel.xpIntoLevel} / {dashboard.userLevel.xpForNextLevel} XP
              avant le niveau {dashboard.userLevel.level + 1}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-4 text-[var(--accent)]" aria-hidden="true" />
              Série
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {dashboard.currentStreak} jour{dashboard.currentStreak > 1 ? "s" : ""}{" "}
              d'affilée (record : {dashboard.longestStreak})
            </p>
            <p className="flex items-center gap-1 text-[var(--text-muted)]">
              <Snowflake className="size-3.5" aria-hidden="true" />
              {dashboard.streakFreezes} gel{dashboard.streakFreezes > 1 ? "s" : ""} de
              série disponible{dashboard.streakFreezes > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objectif hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{GOAL_LABELS[profile?.goal ?? "WHOLE_HOME"]}</p>
            <ProgressBar
              value={dashboard.weeklyMinutesDone}
              max={dashboard.weeklyMinutesGoal}
              label="Progression de l'objectif hebdomadaire"
            />
            <p className="text-[var(--text-muted)]">
              {dashboard.weeklyMinutesDone} / {dashboard.weeklyMinutesGoal} min cette
              semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le parcours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProgressBar
              value={dashboard.levelsCompletedCount}
              max={dashboard.levelsTotal}
              label="Niveaux terminés"
            />
            <p className="text-[var(--text-muted)]">
              {dashboard.levelsCompletedCount} / {dashboard.levelsTotal} niveaux terminés
            </p>
            {dashboard.revisionsDueCount > 0 ? (
              <Link
                href="/revisions"
                className="block text-[var(--accent)] underline underline-offset-4"
              >
                {dashboard.revisionsDueCount} révision
                {dashboard.revisionsDueCount > 1 ? "s" : ""} due
                {dashboard.revisionsDueCount > 1 ? "s" : ""}
              </Link>
            ) : (
              <p className="text-[var(--text-muted)]">
                Aucune révision due pour l'instant.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {dashboard.weakTopics.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Points faibles</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {dashboard.weakTopics.map((topic) => (
                <li key={topic.topic} className="flex items-center justify-between gap-2">
                  <span>{topic.topic}</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                    {Math.round(topic.strugglingRatio * 100)} % à revoir
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Badges — {dashboard.badgesEarnedCount} / {dashboard.badgesTotalCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.recentBadges.length > 0 ? (
            <ul className="flex flex-wrap gap-4">
              {dashboard.recentBadges.map((badge) => (
                <li
                  key={badge.slug}
                  className="flex w-24 flex-col items-center gap-1 text-center text-xs"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                    <BadgeIcon name={badge.icon} className="size-6" />
                  </span>
                  <span>{badge.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Aucun badge débloqué pour l'instant — ils arrivent au fil de votre
              progression.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
