"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@atelier/db";
import { JournalEntryInputSchema } from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * Journal de projet (docs/05 M10, PROJ-07) : notes, décisions, questions et
 * lignes de budget. Toute écriture revalide via `JournalEntryInputSchema`
 * (même règle que `saveRoomVersionAction`, M4) — le client peut envoyer
 * n'importe quoi, jamais une entrée malformée en base.
 */

export interface JournalActionResult {
  ok: boolean;
  error?: string;
}

export async function createJournalEntryAction(
  projectId: string,
  input: unknown,
): Promise<JournalActionResult> {
  const user = await requireOnboardedUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "Projet introuvable." };

  const parsed = JournalEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  await prisma.journalEntry.create({
    data: {
      projectId,
      title: parsed.data.title,
      body: parsed.data.body,
      kind: parsed.data.kind,
    },
  });

  revalidatePath(`/atelier/${projectId}`);
  return { ok: true };
}

export async function deleteJournalEntryAction(entryId: string): Promise<void> {
  const user = await requireOnboardedUser();
  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, project: { userId: user.id } },
    select: { id: true, projectId: true },
  });
  if (!entry) throw new Error("Entrée introuvable.");

  await prisma.journalEntry.delete({ where: { id: entryId } });
  revalidatePath(`/atelier/${entry.projectId}`);
}
