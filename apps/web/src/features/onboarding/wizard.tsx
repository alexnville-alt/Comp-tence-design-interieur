"use client";

import { useActionState, useState } from "react";
import { cn } from "@atelier/ui";
import {
  DIAGNOSTIC_QUESTIONS,
  GOAL_LABELS,
  GOALS,
  HOUSING_LABELS,
  HOUSING_TYPES,
  WEEKLY_PRESETS,
  scoreDiagnostic,
} from "@atelier/domain";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/field";
import { completeOnboardingAction, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

type Goal = (typeof GOALS)[number];
type Housing = (typeof HOUSING_TYPES)[number];

const STEP_TITLES = [
  "Quel est votre objectif ?",
  "Où allez-vous appliquer tout ça ?",
  "Cinq questions pour vous situer",
  "Votre point de départ",
] as const;

/**
 * Onboarding en 4 écrans.
 *
 * Choix de conception : tout est conservé côté client jusqu'à la validation
 * finale, en un seul envoi. Un enregistrement à chaque étape produirait des
 * profils à moitié remplis pour tous ceux qui abandonnent en cours de route —
 * et il faudrait ensuite décider quoi en faire.
 *
 * Le diagnostic est explicitement **passable** : imposer un test à quelqu'un
 * qui vient de créer son compte est le meilleur moyen de le perdre.
 */
export function OnboardingWizard({ firstName }: { firstName: string | null }) {
  const [state, action] = useActionState(completeOnboardingAction, initialState);

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("WHOLE_HOME");
  const [housing, setHousing] = useState<Housing>("HOUSE");
  const [weeklyMinutes, setWeeklyMinutes] = useState<number>(150);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Aperçu immédiat : la même fonction sera rejouée côté serveur, qui reste
  // seul juge du niveau réellement enregistré.
  const result = scoreDiagnostic(answers);

  return (
    <div className="space-y-8">
      <ol className="flex gap-2" aria-label="Progression de l'inscription">
        {STEP_TITLES.map((title, index) => (
          <li key={title} className="flex-1">
            <span className="sr-only">
              Étape {index + 1} sur {STEP_TITLES.length}
              {index === step ? " (en cours)" : ""}
            </span>
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                index <= step ? "bg-[var(--accent)]" : "bg-[var(--border)]",
              )}
              aria-hidden="true"
            />
          </li>
        ))}
      </ol>

      <div>
        <h1 className="text-3xl">
          {step === 0 && firstName ? `Bienvenue ${firstName} — ` : ""}
          {STEP_TITLES[step]}
        </h1>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {step === 0 ? (
        <fieldset className="space-y-3">
          <legend className="sr-only">Objectif</legend>
          {GOALS.map((value) => (
            <ChoiceCard
              key={value}
              name="goal-choice"
              checked={goal === value}
              onSelect={() => setGoal(value)}
              label={GOAL_LABELS[value]}
            />
          ))}
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div className="space-y-8">
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Votre logement</legend>
            {HOUSING_TYPES.map((value) => (
              <ChoiceCard
                key={value}
                name="housing-choice"
                checked={housing === value}
                onSelect={() => setHousing(value)}
                label={HOUSING_LABELS[value]}
              />
            ))}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">
              Combien de temps pouvez-vous y consacrer ?
            </legend>
            {WEEKLY_PRESETS.map((preset) => (
              <ChoiceCard
                key={preset.minutes}
                name="rhythm-choice"
                checked={weeklyMinutes === preset.minutes}
                onSelect={() => setWeeklyMinutes(preset.minutes)}
                label={preset.label}
                hint={preset.hint}
              />
            ))}
          </fieldset>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-8">
          <p className="text-sm text-[var(--text-muted)]">
            Ce n'est pas un examen : personne ne verra vos réponses et rien n'est bloqué.
            Répondre « je ne sais pas » est une réponse utile.
          </p>

          {DIAGNOSTIC_QUESTIONS.map((question, index) => (
            <fieldset key={question.id} className="space-y-3">
              <legend className="mb-2 font-medium">
                {index + 1}. {question.prompt}
              </legend>
              {question.choices.map((choice) => (
                <ChoiceCard
                  key={choice.id}
                  name={question.id}
                  checked={answers[question.id] === choice.id}
                  onSelect={() =>
                    setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))
                  }
                  label={choice.label}
                />
              ))}
            </fieldset>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <form action={action} className="space-y-6">
          <input type="hidden" name="goal" value={goal} />
          <input type="hidden" name="housingType" value={housing} />
          <input type="hidden" name="weeklyMinutes" value={weeklyMinutes} />
          <input type="hidden" name="diagnosticAnswers" value={JSON.stringify(answers)} />

          <Alert tone="success" title={`Niveau ${result.startingLevel}`}>
            {result.rationale}
          </Alert>

          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--text-muted)]">Objectif</dt>
              <dd className="font-medium">{GOAL_LABELS[goal]}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Logement</dt>
              <dd className="font-medium">{HOUSING_LABELS[housing]}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Rythme</dt>
              <dd className="font-medium">
                {WEEKLY_PRESETS.find((p) => p.minutes === weeklyMinutes)?.label}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Revenir
            </Button>
            <SubmitButton pendingLabel="Enregistrement…">
              Commencer mon parcours
            </SubmitButton>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Revenir
            </Button>
          ) : null}
          <Button onClick={() => setStep(step + 1)}>Continuer</Button>
          {step === 2 ? (
            <Button variant="ghost" onClick={() => setStep(3)}>
              Passer le diagnostic
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Option sélectionnable.
 *
 * Implémentée avec un vrai `<input type="radio">` masqué visuellement plutôt
 * qu'avec un `<div onClick>` : on hérite gratuitement de la navigation aux
 * flèches, de la sémantique de groupe et de l'annonce par les lecteurs
 * d'écran — trois choses qu'un `div` cliquable oblige à réimplémenter, et
 * qu'on réimplémente presque toujours mal.
 */
function ChoiceCard({
  name,
  label,
  hint,
  checked,
  onSelect,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[var(--radius-atelier)] border p-4 transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--bg)]",
        checked
          ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
          : "border-[var(--border-strong)] bg-[var(--surface-raised)] hover:bg-[var(--surface)]",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-full border-2",
          checked
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--border-strong)]",
        )}
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-[var(--text-muted)]">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
