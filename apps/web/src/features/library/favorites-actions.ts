"use server";

import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";

const DEFAULT_COLLECTION = "default";

export interface ToggleFavoriteResult {
  ok: boolean;
  isFavorite: boolean;
}

/**
 * Bascule un favori (docs/05 M7). Toujours revérifié serveur : le client
 * n'envoie qu'un slug, jamais un état "actuel" auquel on ferait confiance —
 * même principe d'autorisation que le reste de l'application (docs/02 §6).
 */
export async function toggleFavoriteAction(
  slug: string,
  collection: string = DEFAULT_COLLECTION,
): Promise<ToggleFavoriteResult> {
  const user = await requireOnboardedUser();

  const item = await prisma.libraryItem.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!item) return { ok: false, isFavorite: false };

  const existing = await prisma.favorite.findUnique({
    where: { userId_itemId_collection: { userId: user.id, itemId: item.id, collection } },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_itemId_collection: { userId: user.id, itemId: item.id, collection },
      },
    });
    return { ok: true, isFavorite: false };
  }

  await prisma.favorite.create({
    data: { userId: user.id, itemId: item.id, collection },
  });
  return { ok: true, isFavorite: true };
}
