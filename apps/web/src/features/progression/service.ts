import { prisma, type XpReason } from "@atelier/db";
import {
  BadgeCriteriaSchema,
  evaluateBadge,
  recordDailyActivity,
  todayUtcDateString,
  XP_AMOUNTS,
  type BadgeEvaluationContext,
} from "@atelier/domain";

/**
 * Crédit XP, mise à jour de série et déblocage de badges (docs/05 M9).
 *
 * Point d'entrée unique : chaque action qui gagne du XP (leçon terminée,
 * exercice réussi la première fois, évaluation réussie la première fois,
 * révision) appelle `awardXp`, jamais `XpEvent.create`/`Profile.update`
 * directement — c'est ce qui garantit que série et badges restent toujours
 * synchronisés avec le XP, sans dupliquer la logique à chaque site d'appel.
 */

export interface EarnedBadge {
  slug: string;
  title: string;
  description: string;
  icon: string;
}

export interface AwardXpResult {
  totalXp: number;
  currentStreak: number;
  newBadges: EarnedBadge[];
}

async function computeBadgeCounts(userId: string): Promise<Record<string, number>> {
  const [
    lessonCompleted,
    projectCreated,
    roomCreated,
    photoAnalysis,
    moodboardGenerated,
    favoriteLibrary,
    exerciseCompleted,
    reviewAgg,
    levelMastered,
    perfectExercise,
  ] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.project.count({ where: { userId } }),
    prisma.room.count({ where: { project: { userId } } }),
    prisma.photoAnalysis.count({ where: { asset: { userId } } }),
    prisma.moodboard.count({ where: { project: { userId } } }),
    prisma.favorite.count({ where: { userId } }),
    prisma.submission.findMany({
      where: { userId, correct: true },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    }),
    prisma.cardReview.aggregate({ where: { userId }, _sum: { reps: true } }),
    prisma.levelProgress.count({
      where: { userId, completedAt: { not: null }, bestScore: { gte: 90 } },
    }),
    prisma.submission.findMany({
      where: { userId, attempt: 1, scoreRatio: 1 },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    }),
  ]);

  return {
    lesson_completed: lessonCompleted,
    project_created: projectCreated,
    room_created: roomCreated,
    photo_analysis: photoAnalysis,
    moodboard_generated: moodboardGenerated,
    favorite_library: favoriteLibrary,
    exercise_completed: exerciseCompleted.length,
    review_completed: reviewAgg._sum.reps ?? 0,
    level_mastered: levelMastered,
    perfect_exercise: perfectExercise.length,
  };
}

async function evaluateAndAwardBadges(
  userId: string,
  currentStreak: number,
): Promise<EarnedBadge[]> {
  const [allBadges, alreadyEarned, completedLevels, counts] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    prisma.levelProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { level: { select: { number: true } } },
    }),
    computeBadgeCounts(userId),
  ]);

  const earnedBadgeIds = new Set(alreadyEarned.map((b) => b.badgeId));
  const context: BadgeEvaluationContext = {
    currentStreak,
    completedLevelNumbers: completedLevels.map((lp) => lp.level.number),
    counts,
  };

  const newlyEarned: EarnedBadge[] = [];
  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;
    const criteria = BadgeCriteriaSchema.safeParse(badge.criteria);
    if (!criteria.success) continue; // défensif : ne peut arriver qu'un badge corrompu en base
    if (!evaluateBadge(criteria.data, context)) continue;

    await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
    newlyEarned.push({
      slug: badge.slug,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
    });
  }
  return newlyEarned;
}

/**
 * Crédite `amount` XP pour `reason`, met à jour la série du jour et débloque
 * les badges nouvellement mérités. `refId` référence librement la leçon,
 * l'exercice ou l'évaluation à l'origine du gain (docs/04 §3.4).
 *
 * Le gain de série (`XP_AMOUNTS.STREAK_DAY`) n'est crédité qu'une fois par
 * jour, la première fois que ce jour est enregistré — `recordDailyActivity`
 * est idempotent au sein d'un même jour, donc un deuxième `awardXp` le même
 * jour ne recrédite rien pour la série.
 */
export async function awardXp(
  userId: string,
  amount: number,
  reason: XpReason,
  refId?: string,
): Promise<AwardXpResult> {
  await prisma.xpEvent.create({ data: { userId, amount, reason, refId: refId ?? null } });

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
    select: {
      totalXp: true,
      currentStreak: true,
      longestStreak: true,
      streakFreezes: true,
      lastActiveDate: true,
    },
  });

  const today = todayUtcDateString();
  const lastActiveDate = profile.lastActiveDate
    ? profile.lastActiveDate.toISOString().slice(0, 10)
    : null;
  const isNewDay = lastActiveDate !== today;

  const nextStreak = recordDailyActivity(
    {
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      streakFreezes: profile.streakFreezes,
      lastActiveDate,
    },
    today,
  );

  const streakBonus = isNewDay ? XP_AMOUNTS.STREAK_DAY : 0;
  if (isNewDay) {
    await prisma.xpEvent.create({
      data: { userId, amount: streakBonus, reason: "STREAK", refId: null },
    });
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data: {
      totalXp: { increment: amount + streakBonus },
      currentStreak: nextStreak.currentStreak,
      longestStreak: nextStreak.longestStreak,
      streakFreezes: nextStreak.streakFreezes,
      lastActiveDate: new Date(`${today}T00:00:00.000Z`),
    },
    select: { totalXp: true },
  });

  const newBadges = await evaluateAndAwardBadges(userId, nextStreak.currentStreak);

  return { totalXp: updated.totalXp, currentStreak: nextStreak.currentStreak, newBadges };
}

/**
 * Marque une activité (heartbeat, PROG-05) sans gain de XP propre — seul le
 * gel de série peut en découler (`XP_AMOUNTS.STREAK_DAY`), comme pour
 * `awardXp`. Chemin volontairement séparé plutôt qu'un appel à `awardXp`
 * avec `amount: 0` : le heartbeat arrive toutes les 30 s pendant qu'une page
 * est visible, et la très grande majorité des appels (déjà actif
 * aujourd'hui) doivent rester un simple `SELECT` sans écriture ni évaluation
 * de badges — pas un `INSERT` de `XpEvent` à chaque battement.
 */
export async function touchActivity(userId: string): Promise<void> {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      streakFreezes: true,
      lastActiveDate: true,
    },
  });

  const today = todayUtcDateString();
  const lastActiveDate = profile.lastActiveDate
    ? profile.lastActiveDate.toISOString().slice(0, 10)
    : null;
  if (lastActiveDate === today) return;

  const nextStreak = recordDailyActivity(
    {
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      streakFreezes: profile.streakFreezes,
      lastActiveDate,
    },
    today,
  );

  await prisma.xpEvent.create({
    data: { userId, amount: XP_AMOUNTS.STREAK_DAY, reason: "STREAK", refId: null },
  });
  await prisma.profile.update({
    where: { userId },
    data: {
      totalXp: { increment: XP_AMOUNTS.STREAK_DAY },
      currentStreak: nextStreak.currentStreak,
      longestStreak: nextStreak.longestStreak,
      streakFreezes: nextStreak.streakFreezes,
      lastActiveDate: new Date(`${today}T00:00:00.000Z`),
    },
  });

  await evaluateAndAwardBadges(userId, nextStreak.currentStreak);
}
