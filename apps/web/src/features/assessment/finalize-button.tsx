"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finalizeAssessmentAction, type FinalizeAssessmentResult } from "./actions";

export function FinalizeAssessmentButton({
  assessmentId,
  parcoursHref,
}: {
  assessmentId: string;
  parcoursHref: string;
}) {
  const [result, setResult] = React.useState<FinalizeAssessmentResult | null>(null);
  const [pending, setPending] = React.useState(false);

  function handleClick() {
    setPending(true);
    void finalizeAssessmentAction(assessmentId).then((outcome) => {
      setResult(outcome);
      setPending(false);
    });
  }

  if (result?.ok) {
    return (
      <div
        role="status"
        className={`flex items-start gap-3 rounded-[var(--radius-atelier)] border p-4 text-sm text-[var(--text)] ${
          result.passed
            ? "border-[var(--success)] bg-[var(--success-subtle)]"
            : "border-[var(--warning)] bg-[var(--warning-subtle)]"
        }`}
      >
        {result.passed ? (
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-[var(--success)]"
            aria-hidden="true"
          />
        ) : (
          <XCircle
            className="mt-0.5 size-5 shrink-0 text-[var(--warning)]"
            aria-hidden="true"
          />
        )}
        <div className="space-y-2">
          <p className="font-medium">
            Score : {result.score}/100 (seuil de réussite : {result.passingScore}/100)
          </p>
          <p>
            {result.passed
              ? "Niveau validé — le suivant est déverrouillé."
              : "Pas encore le seuil requis. Revoyez les leçons concernées et retentez l'évaluation quand vous voulez : rien n'est verrouillé."}
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href={parcoursHref}>Retour au parcours</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {result.error}
        </p>
      ) : null}
      <Button type="button" onClick={handleClick} disabled={pending}>
        Valider l'évaluation
      </Button>
    </div>
  );
}
