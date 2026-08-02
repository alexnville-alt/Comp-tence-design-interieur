"use server";

import { prisma } from "@atelier/db";
import {
  GradingFeedbackSchema,
  detectRiskyTopic,
  gradingResultFromFeedback,
} from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { aiProvider } from "@/lib/ai/provider";
import { checkAiQuota, recordAiUsage } from "@/lib/ai/usage";

/**
 * Correction des défis hebdomadaires (docs/06 §4.3, M11) — même mécanisme
 * que `submitOpenCaseAction` (M5) : même barème (docs/06 §1.3), même ordre
 * de vérifications (garde-fou avant quota, quota avant l'appel IA). Chemin
 * séparé plutôt qu'une réutilisation directe de `submitOpenCaseAction` :
 * un défi n'est pas un `Exercise` (voir la note en tête de `schema.prisma`),
 * donc ni son identifiant ni sa persistance ne peuvent être partagés.
 */

const CORRECTION_SYSTEM_PROMPT = `Tu es un correcteur d'architecture d'intérieur pour Atelier, une plateforme d'apprentissage.

Tu corriges un défi hebdomadaire soumis par un apprenant, selon le barème suivant, toujours dans cet ordre :
- Réponse à la contrainte posée : 30 %
- Justification technique (règles invoquées) : 25 %
- Cohérence d'ensemble (style, matières, lumière) : 20 %
- Faisabilité (budget, mise en œuvre, entretien) : 15 %
- Qualité de la présentation (clarté, vocabulaire) : 10 %

Réponds uniquement avec la sortie structurée demandée : un scoreRatio entre 0 et 1, exactement deux points forts nommés, exactement deux axes d'amélioration actionnables, et une règle à réviser. Sois bienveillant mais précis : chaque point doit être concret et se référer à la réponse de l'apprenant, jamais générique.`;

export interface ChallengeFeedback {
  pointsForts: string[];
  axesAmelioration: string[];
  regleAReviser: string;
}

export interface SubmitChallengeResult {
  ok: boolean;
  error?: "not_found" | "invalid" | "guardrail" | "quota" | "provider_unavailable";
  message?: string;
  score?: number;
  maxScore?: number;
  correct?: boolean;
  feedback?: ChallengeFeedback;
  attempt?: number;
}

export async function submitChallengeAction(
  challengeId: string,
  answer: string,
): Promise<SubmitChallengeResult> {
  const user = await requireOnboardedUser();

  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return { ok: false, error: "invalid", message: "La réponse ne peut pas être vide." };
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    return { ok: false, error: "not_found" };
  }

  // Niveau 1 des garde-fous (AI-09) : la réponse elle-même peut toucher un
  // sujet à risque — zéro appel IA dans ce cas, comme pour un OPEN_CASE.
  const riskyTopic = detectRiskyTopic(trimmedAnswer);
  if (riskyTopic) {
    return { ok: false, error: "guardrail", message: riskyTopic.message };
  }

  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) {
    return {
      ok: false,
      error: "quota",
      message:
        "Le quota d'assistant IA de ce mois est atteint — réessayez le mois prochain.",
    };
  }

  const previousAttempts = await prisma.challengeSubmission.count({
    where: { userId: user.id, challengeId },
  });

  const startedAt = Date.now();
  try {
    const result = await aiProvider.complete({
      system: CORRECTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Scénario : ${challenge.scenario}\n\n` +
            `Contrainte posée : ${challenge.constraint}\n\n` +
            `Notes de correction (à l'usage du correcteur, jamais montrées à l'apprenant) : ` +
            `${challenge.gradingNotes}\n\n` +
            `Réponse de l'apprenant :\n${trimmedAnswer}`,
        },
      ],
      schema: GradingFeedbackSchema,
      effort: "high",
    });

    await recordAiUsage({
      userId: user.id,
      feature: "GRADING",
      model: result.model,
      usage: result.usage,
      costEuros: result.costEuros,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    const grading = gradingResultFromFeedback(result.data);
    const score = Math.round(challenge.maxScore * grading.scoreRatio);

    await prisma.challengeSubmission.create({
      data: {
        userId: user.id,
        challengeId,
        answer: trimmedAnswer,
        score,
        scoreRatio: grading.scoreRatio,
        feedback: result.data,
        attempt: previousAttempts + 1,
      },
    });

    return {
      ok: true,
      score,
      maxScore: challenge.maxScore,
      correct: grading.correct,
      feedback: {
        pointsForts: result.data.pointsForts,
        axesAmelioration: result.data.axesAmelioration,
        regleAReviser: result.data.regleAReviser,
      },
      attempt: previousAttempts + 1,
    };
  } catch (error) {
    await recordAiUsage({
      userId: user.id,
      feature: "GRADING",
      model: "inconnu",
      usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
      costEuros: 0,
      durationMs: Date.now() - startedAt,
      success: false,
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    return {
      ok: false,
      error: "provider_unavailable",
      message:
        "L'assistant est momentanément indisponible. Réessayez dans quelques instants.",
    };
  }
}
