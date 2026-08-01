import { prisma, type AiFeature } from "@atelier/db";
import type { AiUsageTokens } from "@atelier/ai";

/**
 * Quotas et suivi des coûts IA (docs/02 §5.6, docs/05 M5).
 *
 * Deux règles non négociables (critères d'acceptation M5) :
 * 1. Le quota est vérifié **avant** tout appel au fournisseur — jamais après.
 * 2. `AiUsage` reçoit une ligne après **chaque** appel, réussi ou non
 *    (docs/04 §3.9 : « un enregistrement par appel ») : un échec doit coûter
 *    aussi cher à compter qu'à éviter, sinon les quotas ne protègent rien.
 */

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  quota: number;
}

function startOfCurrentMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** À appeler avant tout appel au fournisseur IA — jamais après. */
export async function checkAiQuota(userId: string): Promise<QuotaCheck> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { aiMonthlyQuota: true },
  });
  // Pas de profil (compte non onboardé) : aucun appel autorisé plutôt qu'une
  // limite implicite illimitée.
  const quota = profile?.aiMonthlyQuota ?? 0;

  const used = await prisma.aiUsage.count({
    where: { userId, createdAt: { gte: startOfCurrentMonth() } },
  });

  return { allowed: used < quota, used, quota };
}

export interface RecordAiUsageInput {
  userId: string;
  feature: AiFeature;
  model: string;
  usage: AiUsageTokens;
  /** Coût réel de l'appel, en euros (`AiResult.costEuros`) — converti ici en centimes (`AiUsage.costCents`, un entier). */
  costEuros: number;
  durationMs: number;
  success: boolean;
  errorCode?: string;
}

/** À appeler après chaque appel au fournisseur IA, succès ou échec. */
export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  await prisma.aiUsage.create({
    data: {
      userId: input.userId,
      feature: input.feature,
      model: input.model,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      cachedTokens: input.usage.cachedTokens,
      costCents: Math.round(input.costEuros * 100),
      durationMs: input.durationMs,
      success: input.success,
      errorCode: input.errorCode ?? null,
    },
  });
}
