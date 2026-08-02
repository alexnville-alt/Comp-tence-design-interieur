"use server";

import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";
import { touchActivity } from "./service";
import { HEARTBEAT_INTERVAL_MS } from "./heartbeat";

/**
 * Temps réel passé, par heartbeat (docs/05 M9, PROG-05).
 *
 * Jamais de durée envoyée par le client : chaque appel reçu crédite un
 * montant **fixe** (`HEARTBEAT_INTERVAL_MS`), jamais une valeur calculée
 * côté navigateur — un onglet ne peut donc jamais gonfler son propre temps
 * mesuré en falsifiant la requête. Le client ne décide que du *si* (il
 * n'envoie un battement que pendant que la page est visible et au premier
 * plan, `heartbeat-tracker.tsx`), jamais du *combien*.
 *
 * Continuation plutôt que nouvelle session : si la dernière session de ce
 * contexte a été touchée il y a moins de deux intervalles, on l'étend
 * (`activeMs` incrémenté) au lieu d'en ouvrir une nouvelle — une brève
 * latence réseau entre deux battements ne doit pas fragmenter une session
 * continue en dizaines de lignes.
 */
const CONTINUATION_GAP_MS = HEARTBEAT_INTERVAL_MS * 2;

export async function heartbeatAction(context?: string): Promise<{ ok: boolean }> {
  const user = await requireOnboardedUser();
  const now = new Date();

  const recent = await prisma.studySession.findFirst({
    where: { userId: user.id, context: context ?? null },
    orderBy: { endedAt: "desc" },
  });

  const isContinuation =
    !!recent?.endedAt && now.getTime() - recent.endedAt.getTime() <= CONTINUATION_GAP_MS;

  if (isContinuation && recent) {
    await prisma.studySession.update({
      where: { id: recent.id },
      data: { activeMs: { increment: HEARTBEAT_INTERVAL_MS }, endedAt: now },
    });
  } else {
    await prisma.studySession.create({
      data: {
        userId: user.id,
        startedAt: new Date(now.getTime() - HEARTBEAT_INTERVAL_MS),
        endedAt: now,
        activeMs: HEARTBEAT_INTERVAL_MS,
        context: context ?? null,
      },
    });
  }

  await touchActivity(user.id);

  return { ok: true };
}
