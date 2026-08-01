import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  State,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";

/**
 * Répétition espacée — FSRS-6 (ADR-0007).
 *
 * Fonctions pures : même état + même note + même horodatage produisent
 * toujours le même résultat, sans horloge ni accès réseau internes — c'est ce
 * qui les rend exécutables aussi bien côté serveur (source de vérité) que
 * côté client (aperçu « prochaine révision dans 4 jours » sans aller-retour).
 *
 * `enable_short_term: false` désactive les paliers d'apprentissage
 * infra-journaliers d'Anki (« revoir dans 10 minutes ») : l'application ne
 * propose qu'une file quotidienne, jamais plusieurs passages sur la même
 * carte dans la même session. Avec ce réglage, chaque note fait directement
 * progresser stabilité/difficulté via l'algorithme FSRS plutôt que via une
 * table de paliers — plus simple à faire correspondre à « file du jour ».
 */

export const CARD_STATES = ["NEW", "LEARNING", "REVIEW", "RELEARNING"] as const;
export type CardStateName = (typeof CARD_STATES)[number];

export const RATINGS = [1, 2, 3, 4] as const;
export type ReviewRating = (typeof RATINGS)[number];
export const RATING_LABELS: Record<ReviewRating, string> = {
  1: "À revoir",
  2: "Difficile",
  3: "Correct",
  4: "Facile",
};

export interface CardMemoryState {
  stability: number;
  difficulty: number;
  dueAt: Date;
  lastReviewAt: Date | null;
  reps: number;
  lapses: number;
  state: CardStateName;
}

const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_short_term: false }),
);

const STATE_TO_NAME: Record<State, CardStateName> = {
  [State.New]: "NEW",
  [State.Learning]: "LEARNING",
  [State.Review]: "REVIEW",
  [State.Relearning]: "RELEARNING",
};

const NAME_TO_STATE: Record<CardStateName, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

function fromFsrsCard(card: FsrsCard): CardMemoryState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    dueAt: card.due,
    lastReviewAt: card.last_review ?? null,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_TO_NAME[card.state],
  };
}

function toFsrsCard(memory: CardMemoryState): FsrsCard {
  return {
    due: memory.dueAt,
    stability: memory.stability,
    difficulty: memory.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: memory.reps,
    lapses: memory.lapses,
    state: NAME_TO_STATE[memory.state],
    ...(memory.lastReviewAt ? { last_review: memory.lastReviewAt } : {}),
  };
}

/** État d'une carte jamais révisée par cet utilisateur. */
export function initCardState(now: Date): CardMemoryState {
  return fromFsrsCard(createEmptyCard(now));
}

/** Calcule le nouvel état après une note (1 à revoir … 4 facile). */
export function scheduleReview(
  current: CardMemoryState,
  rating: ReviewRating,
  now: Date,
): CardMemoryState {
  const grade: Grade = rating;
  const { card } = scheduler.next(toFsrsCard(current), now, grade);
  return fromFsrsCard(card);
}

/** Une carte est due si son `dueAt` n'est pas dans le futur. */
export function isDue(state: CardMemoryState, now: Date): boolean {
  return state.dueAt.getTime() <= now.getTime();
}
