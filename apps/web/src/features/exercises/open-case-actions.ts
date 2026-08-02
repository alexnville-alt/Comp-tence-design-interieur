"use server";

import { prisma } from "@atelier/db";
import {
  OpenCaseFrontmatterSchema,
  GradingFeedbackSchema,
  detectRiskyTopic,
  gradingResultFromFeedback,
} from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { aiProvider } from "@/lib/ai/provider";
import { checkAiQuota, recordAiUsage } from "@/lib/ai/usage";
import { awardXp } from "@/features/progression/service";

/**
 * Correction des cas ouverts (OPEN_CASE, docs/05 M5, docs/06 §1.3).
 *
 * À la différence de `submitExerciseAction` (`grading.ts`, pure et
 * synchrone), cette action appelle le fournisseur IA — d'où un chemin
 * séparé plutôt qu'une branche de plus dans `gradeExercise` : ordre des
 * vérifications identique à la route de chat (`/api/ai/chat`), garde-fou
 * avant quota, quota avant l'appel.
 */

const CORRECTION_SYSTEM_PROMPT = `Tu es un correcteur d'architecture d'intérieur pour Atelier, une plateforme d'apprentissage.

Tu corriges un cas pratique ouvert soumis par un apprenant, selon le barème suivant, toujours dans cet ordre :
- Réponse à la contrainte posée : 30 %
- Justification technique (règles invoquées) : 25 %
- Cohérence d'ensemble (style, matières, lumière) : 20 %
- Faisabilité (budget, mise en œuvre, entretien) : 15 %
- Qualité de la présentation (clarté, vocabulaire) : 10 %

Réponds uniquement avec la sortie structurée demandée : un scoreRatio entre 0 et 1, exactement deux points forts nommés, exactement deux axes d'amélioration actionnables, et une règle à réviser. Sois bienveillant mais précis : chaque point doit être concret et se référer à la réponse de l'apprenant, jamais générique.`;

export interface OpenCaseFeedback {
  pointsForts: string[];
  axesAmelioration: string[];
  regleAReviser: string;
}

export interface SubmitOpenCaseResult {
  ok: boolean;
  error?: "not_found" | "invalid" | "guardrail" | "quota" | "provider_unavailable";
  message?: string;
  score?: number;
  maxScore?: number;
  correct?: boolean;
  feedback?: OpenCaseFeedback;
  attempt?: number;
}

export async function submitOpenCaseAction(
  exerciseId: string,
  answer: string,
): Promise<SubmitOpenCaseResult> {
  const user = await requireOnboardedUser();

  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return { ok: false, error: "invalid", message: "La réponse ne peut pas être vide." };
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise || exercise.type !== "OPEN_CASE") {
    return { ok: false, error: "not_found" };
  }

  const parsedExercise = OpenCaseFrontmatterSchema.safeParse(exercise.payload);
  if (!parsedExercise.success) {
    return { ok: false, error: "invalid" };
  }

  // Niveau 1 des garde-fous (AI-09) : la réponse de l'apprenant elle-même
  // peut toucher un sujet à risque (ex. « je veux abattre ce mur ») —
  // zéro appel IA dans ce cas aussi, pas seulement pour le chat.
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

  const [previousAttempts, hadPriorCorrect] = await Promise.all([
    prisma.submission.count({ where: { userId: user.id, exerciseId } }),
    prisma.submission.findFirst({
      where: { userId: user.id, exerciseId, correct: true },
      select: { id: true },
    }),
  ]);

  const startedAt = Date.now();
  try {
    const result = await aiProvider.complete({
      system: CORRECTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Scénario : ${parsedExercise.data.scenario}\n\n` +
            `Contrainte posée : ${parsedExercise.data.constraint}\n\n` +
            `Notes de correction (à l'usage du correcteur, jamais montrées à l'apprenant) : ` +
            `${parsedExercise.data.gradingNotes}\n\n` +
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
    const score = Math.round(exercise.maxScore * grading.scoreRatio);

    await prisma.submission.create({
      data: {
        userId: user.id,
        exerciseId,
        answer: { text: trimmedAnswer },
        score,
        scoreRatio: grading.scoreRatio,
        correct: grading.correct,
        gradedBy: "AI",
        feedback: result.data,
        attempt: previousAttempts + 1,
      },
    });

    if (grading.correct && !hadPriorCorrect) {
      await awardXp(user.id, exercise.xpReward, "EXERCISE", exerciseId);
    }

    return {
      ok: true,
      score,
      maxScore: exercise.maxScore,
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
    // Fournisseur indisponible : l'application reste utilisable (critère
    // d'acceptation M5) — l'apprenant peut réessayer, rien n'est perdu.
    return {
      ok: false,
      error: "provider_unavailable",
      message:
        "L'assistant est momentanément indisponible. Réessayez dans quelques instants.",
    };
  }
}
