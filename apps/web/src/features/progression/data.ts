import { prisma } from "@atelier/db";
import { computeUserLevel, LEVELS, type UserLevel } from "@atelier/domain";

/**
 * Données du tableau de bord (docs/05 M9, PROG-06) — une seule fonction
 * d'agrégation plutôt qu'un appel par widget : toutes les requêtes partent
 * en parallèle (`Promise.all`), la page ne fait qu'un aller-retour réseau
 * conceptuel malgré le nombre de sources différentes.
 */

export interface WeakTopic {
  topic: string;
  strugglingRatio: number;
  reviewedCount: number;
}

/** Un jour compte comme "cette semaine" à partir de lundi 00:00 UTC. */
function startOfWeekUtc(now = new Date()): Date {
  const day = now.getUTCDay(); // 0 = dimanche .. 6 = samedi
  const diffToMonday = (day + 6) % 7;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday),
  );
}

/**
 * Thèmes les plus fragiles, dérivés de `CardReview.lastRating` (1-2 = « à
 * revoir »/« difficile »). Un thème avec moins de deux révisions n'a pas
 * assez de signal pour être qualifié de fragile plutôt que « pas encore vu ».
 */
export async function getWeakTopics(userId: string, limit = 3): Promise<WeakTopic[]> {
  const reviews = await prisma.cardReview.findMany({
    where: { userId, lastRating: { not: null } },
    select: { lastRating: true, card: { select: { topic: true } } },
  });

  const byTopic = new Map<string, { struggling: number; total: number }>();
  for (const review of reviews) {
    const entry = byTopic.get(review.card.topic) ?? { struggling: 0, total: 0 };
    entry.total++;
    if ((review.lastRating ?? 4) <= 2) entry.struggling++;
    byTopic.set(review.card.topic, entry);
  }

  return [...byTopic.entries()]
    .filter(([, stats]) => stats.total >= 2)
    .map(([topic, stats]) => ({
      topic,
      strugglingRatio: stats.struggling / stats.total,
      reviewedCount: stats.total,
    }))
    .sort((a, b) => b.strugglingRatio - a.strugglingRatio)
    .slice(0, limit);
}

export interface EarnedBadgeSummary {
  slug: string;
  title: string;
  icon: string;
  earnedAt: Date;
}

export interface DashboardData {
  totalXp: number;
  userLevel: UserLevel;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  weeklyMinutesGoal: number;
  weeklyMinutesDone: number;
  levelsCompletedCount: number;
  levelsTotal: number;
  revisionsDueCount: number;
  weakTopics: WeakTopic[];
  badgesEarnedCount: number;
  badgesTotalCount: number;
  recentBadges: EarnedBadgeSummary[];
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    profile,
    levelsCompleted,
    revisionsDue,
    weekSessions,
    badgesEarnedCount,
    badgesTotalCount,
    recentBadges,
    weakTopics,
  ] = await Promise.all([
    prisma.profile.findUniqueOrThrow({
      where: { userId },
      select: {
        totalXp: true,
        currentStreak: true,
        longestStreak: true,
        streakFreezes: true,
        weeklyMinutes: true,
      },
    }),
    prisma.levelProgress.count({ where: { userId, completedAt: { not: null } } }),
    prisma.cardReview.count({ where: { userId, dueAt: { lte: new Date() } } }),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: startOfWeekUtc() } },
      _sum: { activeMs: true },
    }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.badge.count(),
    prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      take: 4,
      include: { badge: { select: { slug: true, title: true, icon: true } } },
    }),
    getWeakTopics(userId),
  ]);

  return {
    totalXp: profile.totalXp,
    userLevel: computeUserLevel(profile.totalXp),
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
    streakFreezes: profile.streakFreezes,
    weeklyMinutesGoal: profile.weeklyMinutes,
    weeklyMinutesDone: Math.round((weekSessions._sum.activeMs ?? 0) / 60_000),
    levelsCompletedCount: levelsCompleted,
    levelsTotal: LEVELS.length,
    revisionsDueCount: revisionsDue,
    weakTopics,
    badgesEarnedCount,
    badgesTotalCount,
    recentBadges: recentBadges.map((entry) => ({
      slug: entry.badge.slug,
      title: entry.badge.title,
      icon: entry.badge.icon,
      earnedAt: entry.earnedAt,
    })),
  };
}
