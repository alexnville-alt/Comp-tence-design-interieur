"use server";

import { prisma } from "@atelier/db";
import {
  initCardState,
  scheduleReview,
  XP_AMOUNTS,
  type ReviewRating,
} from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { awardXp } from "@/features/progression/service";

/**
 * Enregistre une notation de révision (docs/05 M3, ADR-0007).
 *
 * L'état FSRS courant est relu en base, jamais reçu du client : une carte ne
 * peut pas être « bien notée » en falsifiant la requête, puisque le client
 * n'envoie que la note (1 à 4), pas la stabilité ni l'échéance.
 */
export interface ReviewCardResult {
  ok: boolean;
  nextDueAt?: string;
}

export async function reviewCardAction(
  cardId: string,
  rating: ReviewRating,
): Promise<ReviewCardResult> {
  const user = await requireOnboardedUser();
  const now = new Date();

  const existing = await prisma.cardReview.findUnique({
    where: { userId_cardId: { userId: user.id, cardId } },
  });

  const current = existing
    ? {
        stability: existing.stability,
        difficulty: existing.difficulty,
        dueAt: existing.dueAt,
        lastReviewAt: existing.lastReviewAt,
        reps: existing.reps,
        lapses: existing.lapses,
        state: existing.state,
      }
    : initCardState(now);

  const next = scheduleReview(current, rating, now);

  await prisma.cardReview.upsert({
    where: { userId_cardId: { userId: user.id, cardId } },
    update: {
      stability: next.stability,
      difficulty: next.difficulty,
      dueAt: next.dueAt,
      lastReviewAt: next.lastReviewAt,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      lastRating: rating,
    },
    create: {
      userId: user.id,
      cardId,
      stability: next.stability,
      difficulty: next.difficulty,
      dueAt: next.dueAt,
      lastReviewAt: next.lastReviewAt,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      lastRating: rating,
    },
  });

  await awardXp(user.id, XP_AMOUNTS.REVIEW, "REVIEW", cardId);

  return { ok: true, nextDueAt: next.dueAt.toISOString() };
}
