"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { OPEN_CASE_RUBRIC } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { Button } from "@/components/ui/button";
import { submitChallengeAction, type SubmitChallengeResult } from "./challenge-actions";

/**
 * Soumission d'un défi hebdomadaire (docs/06 §4.3, M11) — même barème et
 * même forme de retour qu'un cas pratique ouvert (`OpenCaseExercisePlayer`,
 * M5), volontairement dupliqué plutôt que réutilisé : les deux composants
 * évoluent depuis des identifiants et des Server Actions différents
 * (`Exercise` contre `Challenge`, voir la note en tête de `schema.prisma`).
 */
function RubricList() {
  return (
    <div className="rounded-[var(--radius-atelier)] border border-[var(--border)] p-3 text-sm">
      <p className="mb-2 font-medium text-[var(--text)]">
        Barème de correction (visible avant de répondre)
      </p>
      <ul className="space-y-1 text-[var(--text-muted)]">
        {OPEN_CASE_RUBRIC.map((item) => (
          <li key={item.critere} className="flex justify-between gap-4">
            <span>{item.critere}</span>
            <span className="shrink-0 font-[family-name:var(--font-mono)]">
              {Math.round(item.poids * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChallengeResultBanner({ result }: { result: SubmitChallengeResult }) {
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-[var(--radius-atelier)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-sm text-[var(--text)]"
      >
        {result.message ?? "Réponse non enregistrée — réessayez."}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "space-y-3 rounded-[var(--radius-atelier)] border p-4 text-sm text-[var(--text)]",
        result.correct
          ? "border-[var(--success)] bg-[var(--success-subtle)]"
          : "border-[var(--warning)] bg-[var(--warning-subtle)]",
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {result.correct ? (
          <CheckCircle2
            className="size-5 shrink-0 text-[var(--success)]"
            aria-hidden="true"
          />
        ) : (
          <XCircle className="size-5 shrink-0 text-[var(--warning)]" aria-hidden="true" />
        )}
        Note : {result.score}/{result.maxScore}
      </div>

      {result.feedback ? (
        <>
          <div>
            <p className="font-medium">Points forts</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {result.feedback.pointsForts.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Axes d'amélioration</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {result.feedback.axesAmelioration.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <p>
            <span className="font-medium">Règle à réviser : </span>
            {result.feedback.regleAReviser}
          </p>
        </>
      ) : null}
    </div>
  );
}

export function ChallengePlayer({
  challengeId,
  slug,
}: {
  challengeId: string;
  slug: string;
}) {
  const [answer, setAnswer] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<SubmitChallengeResult | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!answer.trim() || pending) return;
    setPending(true);
    void submitChallengeAction(challengeId, answer).then((outcome) => {
      setResult(outcome);
      setPending(false);
    });
  }

  return (
    <div data-challenge-slug={slug} className="space-y-4">
      <RubricList />

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor={`challenge-${slug}`} className="sr-only">
          Votre réponse
        </label>
        <textarea
          id={`challenge-${slug}`}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={pending}
          rows={6}
          placeholder="Rédigez votre réponse : décrivez votre proposition et justifiez-la."
          className={cn(
            "flex w-full resize-y rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]",
            "placeholder:text-[var(--text-muted)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <Button type="submit" disabled={pending || !answer.trim()}>
          {pending ? "Correction en cours…" : "Envoyer pour correction"}
        </Button>
      </form>

      <p role="status" aria-live="polite" className="sr-only">
        {pending ? "Correction en cours." : result ? "Correction reçue." : ""}
      </p>

      {result ? <ChallengeResultBanner result={result} /> : null}
    </div>
  );
}
