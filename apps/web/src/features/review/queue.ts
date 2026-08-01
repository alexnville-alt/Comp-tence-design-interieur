import { prisma } from "@atelier/db";

/**
 * File de révision quotidienne (docs/05 M3, ADR-0007).
 *
 * Une carte n'a pas de `CardReview` tant que l'utilisateur ne l'a jamais
 * vue : créer la ligne à la synchronisation du contenu ferait exploser
 * `CardReview` en `nombre_de_cartes × nombre_d'utilisateurs`, pour des
 * cartes que personne n'a encore rencontrées. La file mélange donc les
 * révisions dues (`dueAt <= maintenant`) et des cartes neuves, plafonnée à
 * `limit` — la mécanique qui garde "file courte" citée par l'ADR-0007.
 */

export interface QueueCard {
  cardId: string;
  front: string;
  back: string;
  hint: string | null;
  topic: string;
  isNew: boolean;
}

export async function getDailyQueue(userId: string, limit = 20): Promise<QueueCard[]> {
  const now = new Date();

  const dueReviews = await prisma.cardReview.findMany({
    where: { userId, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: { card: true },
  });

  const due: QueueCard[] = dueReviews.map((review) => ({
    cardId: review.cardId,
    front: review.card.front,
    back: review.card.back,
    hint: review.card.hint,
    topic: review.card.topic,
    isNew: false,
  }));

  const remaining = limit - due.length;
  if (remaining <= 0) return due;

  const newCards = await prisma.card.findMany({
    where: { reviews: { none: { userId } } },
    take: remaining,
    orderBy: { id: "asc" },
  });

  return [
    ...due,
    ...newCards.map((card) => ({
      cardId: card.id,
      front: card.front,
      back: card.back,
      hint: card.hint,
      topic: card.topic,
      isNew: true,
    })),
  ];
}
