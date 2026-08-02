"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * Ancrage logement réel et budget d'un projet (docs/05 M10, PROJ-01/08) —
 * `address` reste du texte libre jamais géocodé (voir `schema.prisma`),
 * `budgetCents` alimente l'export PDF et le journal (`JournalEntry.kind =
 * BUDGET`) reste le lieu des lignes détaillées, jamais recalculées ici.
 */
export async function updateProjectSettingsAction(
  projectId: string,
  address: string,
  budgetEuros: number | null,
): Promise<void> {
  const user = await requireOnboardedUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) throw new Error("Projet introuvable.");

  if (budgetEuros != null && (!Number.isFinite(budgetEuros) || budgetEuros < 0)) {
    throw new Error("Budget invalide.");
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      address: address.trim() || null,
      budgetCents: budgetEuros != null ? Math.round(budgetEuros * 100) : null,
    },
  });
  revalidatePath(`/atelier/${project.id}`);
}
