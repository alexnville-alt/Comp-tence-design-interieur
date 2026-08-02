/**
 * XP et niveau utilisateur (docs/05 M9, PROG-01).
 *
 * `Lesson.xpReward`/`Exercise.xpReward` (base) portent déjà le montant pour
 * ces deux raisons — pas de constante ici pour elles. `XP_AMOUNTS` ne couvre
 * que les raisons dont le montant est fixe, indépendant du contenu.
 */
export const XP_AMOUNTS = {
  REVIEW: 2,
  ASSESSMENT_PASS: 100,
  STREAK_DAY: 5,
} as const;

const XP_BASE = 50;

/**
 * XP cumulé requis pour atteindre un niveau — quadratique, paliers de plus
 * en plus longs. `xpForLevel(1) === 0` : personne ne commence en dette.
 */
export function xpForLevel(level: number): number {
  return XP_BASE * (level - 1) ** 2;
}

export interface UserLevel {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  /** 0..1, jamais NaN — voir la garde sur `xpForNextLevel === 0`. */
  progressRatio: number;
}

/**
 * Dérive le niveau utilisateur (distinct du niveau du parcours, `Level`) à
 * partir du XP total. Pure et déterministe : aucune leçon/exercice/révision
 * réels nécessaires pour la tester.
 */
export function computeUserLevel(totalXp: number): UserLevel {
  const xp = Math.max(0, totalXp);
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;

  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentThreshold;
  const xpForNextLevel = nextThreshold - currentThreshold;

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressRatio: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0,
  };
}
