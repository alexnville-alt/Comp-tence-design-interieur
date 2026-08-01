"use server";

import { z } from "zod";
import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * Progression de lecture (docs/05 M2 — « reprise exacte »).
 *
 * Appelées directement depuis le client (pas de `<form action>` ici : la
 * sauvegarde part d'un `IntersectionObserver`, pas d'une soumission), donc
 * chaque fonction revalide elle-même la session — une Server Action est un
 * point d'entrée HTTP à part entière (voir `requireOnboardedUser`).
 *
 * `blockIndex` est le numéro (`n`, 1-indexé — voir `blocks.ts`) du bloc le
 * plus loin atteint ; `0` signifie « pas encore commencée ». Le `blockIndex`
 * reçu du client n'est jamais appliqué tel quel : il est borné à
 * `[0, blockCount]` et ne peut jamais **reculer** par rapport à la valeur
 * déjà enregistrée. Ce deuxième point protège contre un onglet resté ouvert
 * plus haut dans la leçon qui sauvegarderait après un onglet plus récent —
 * la progression réelle est toujours le maximum observé.
 */

const saveProgressSchema = z.object({
  lessonId: z.string().min(1),
  blockIndex: z.number().int().nonnegative(),
  timeSpentMs: z
    .number()
    .int()
    .nonnegative()
    .max(60 * 60 * 1000),
});

export interface SaveProgressResult {
  ok: boolean;
  blockIndex: number;
}

export async function saveLessonProgressAction(
  input: z.infer<typeof saveProgressSchema>,
): Promise<SaveProgressResult> {
  const user = await requireOnboardedUser();
  const parsed = saveProgressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, blockIndex: 0 };
  }
  const { lessonId, blockIndex, timeSpentMs } = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { blockCount: true },
  });
  if (!lesson) return { ok: false, blockIndex: 0 };

  const clamped = Math.min(Math.max(blockIndex, 0), lesson.blockCount);

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    select: { blockIndex: true, status: true, timeSpentMs: true },
  });

  // Une leçon déjà terminée ne redevient jamais "en cours" par une simple
  // sauvegarde de position (relecture après complétion).
  const status = existing?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";
  const nextBlockIndex = Math.max(existing?.blockIndex ?? 0, clamped);

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: {
      blockIndex: nextBlockIndex,
      status,
      timeSpentMs: (existing?.timeSpentMs ?? 0) + timeSpentMs,
    },
    create: {
      userId: user.id,
      lessonId,
      blockIndex: nextBlockIndex,
      status,
      timeSpentMs,
    },
  });

  return { ok: true, blockIndex: progress.blockIndex };
}

const completeLessonSchema = z.object({ lessonId: z.string().min(1) });

export async function completeLessonAction(
  input: z.infer<typeof completeLessonSchema>,
): Promise<{ ok: boolean }> {
  const user = await requireOnboardedUser();
  const parsed = completeLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { lessonId } = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { blockCount: true },
  });
  if (!lesson) return { ok: false };

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: {
      status: "COMPLETED",
      blockIndex: lesson.blockCount,
      completedAt: new Date(),
    },
    create: {
      userId: user.id,
      lessonId,
      status: "COMPLETED",
      blockIndex: lesson.blockCount,
      completedAt: new Date(),
    },
  });

  return { ok: true };
}
