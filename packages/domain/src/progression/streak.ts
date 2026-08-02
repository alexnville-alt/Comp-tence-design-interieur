/**
 * Série de jours consécutifs, avec gel (docs/05 M9, PROG-03).
 *
 * Toute la logique est ancrée sur des dates calendaires UTC (`"AAAA-MM-JJ"`),
 * jamais sur `Date.now()` ni l'horloge/fuseau du serveur ou du client qui
 * appelle cette fonction : `recordDailyActivity` ne lit ni n'écrit d'horloge
 * elle-même, elle reçoit la date du jour déjà résolue. C'est ce qui la rend
 * résistante à un changement de fuseau horaire — un serveur en UTC+2 ou en
 * UTC-8 produit exactement le même résultat pour la même paire de dates,
 * puisqu'aucune conversion locale n'intervient dans le calcul (voir
 * `streak.test.ts`, qui fait varier `process.env.TZ`).
 *
 * `todayUtcDateString` est le seul point qui touche une horloge réelle — il
 * n'est utile qu'à l'appelant (déterminer « quel jour sommes-nous »),
 * jamais à la logique de série elle-même.
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  /** "AAAA-MM-JJ" (UTC) ou `null` si l'utilisateur n'a jamais été actif. */
  lastActiveDate: string | null;
}

/** Un gel absorbe au plus un jour manqué à la fois — pas de stock illimité. */
export const MAX_STREAK_FREEZES = 2;
/** « Gel de série » : un gel regagné toutes les `FREEZE_EVERY_DAYS` de série active (PROG-03, "1/semaine"). */
export const FREEZE_EVERY_DAYS = 7;

/** Toujours UTC (`toISOString`) — jamais le fuseau local du serveur ou du navigateur. */
export function todayUtcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

/**
 * Applique une activité datée d'aujourd'hui à l'état de série. Idempotent
 * (rappeler avec la même date ne change rien) et sans effet de bord.
 */
export function recordDailyActivity(state: StreakState, todayUTC: string): StreakState {
  if (state.lastActiveDate === todayUTC) return state;

  if (state.lastActiveDate === null) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, state.longestStreak),
      streakFreezes: state.streakFreezes,
      lastActiveDate: todayUTC,
    };
  }

  const gap = daysBetween(state.lastActiveDate, todayUTC);
  // Horloge serveur incohérente (date reçue antérieure à la dernière
  // activité connue) : on ne touche à rien plutôt que de corrompre la série.
  if (gap <= 0) return state;

  let currentStreak: number;
  let streakFreezes = state.streakFreezes;

  if (gap === 1) {
    currentStreak = state.currentStreak + 1;
  } else if (gap === 2 && state.streakFreezes > 0) {
    // Exactement un jour manqué, absorbé par un gel : la série continue
    // comme si de rien n'était, le gel est consommé.
    currentStreak = state.currentStreak + 1;
    streakFreezes -= 1;
  } else {
    currentStreak = 1;
  }

  if (
    currentStreak > 0 &&
    currentStreak % FREEZE_EVERY_DAYS === 0 &&
    streakFreezes < MAX_STREAK_FREEZES
  ) {
    streakFreezes += 1;
  }

  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    streakFreezes,
    lastActiveDate: todayUTC,
  };
}
