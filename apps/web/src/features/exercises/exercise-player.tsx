"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import type { PublicExercise } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { Button } from "@/components/ui/button";
import { submitExerciseAction, type SubmitExerciseResult } from "./actions";

/**
 * Lecteur d'exercices (docs/05 M3) — un composant par type, partageant la
 * même mécanique de soumission et de correction immédiate.
 *
 * Chaque type gère sa propre forme de réponse locale, mais la note affichée
 * vient toujours de `submitExerciseAction` (serveur) : aucun composant ne
 * calcule lui-même s'il a « juste » ou « faux ».
 */

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function ResultBanner({ result }: { result: SubmitExerciseResult }) {
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-[var(--radius-atelier)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-sm text-[var(--text)]"
      >
        Réponse non enregistrée — réessayez.
      </div>
    );
  }
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-[var(--radius-atelier)] border p-4 text-sm text-[var(--text)]",
        result.correct
          ? "border-[var(--success)] bg-[var(--success-subtle)]"
          : "border-[var(--warning)] bg-[var(--warning-subtle)]",
      )}
    >
      {result.correct ? (
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
      <div className="space-y-1">
        <p className="font-medium">
          {result.correct ? "Correct" : "Pas tout à fait"} — {result.score}/
          {result.maxScore}
        </p>
        <p>{result.explanation}</p>
      </div>
    </div>
  );
}

interface TypedPlayerProps<A> {
  onSubmit: (answer: A) => void;
  disabled: boolean;
}

function McqPlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ selectedIndices: number[] }> & {
  exercise: Extract<PublicExercise, { type: "QUIZ_MCQ" }>;
}) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ selectedIndices: [...selected] });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">{exercise.prompt}</legend>
        {exercise.choices.map((choice, i) => (
          <label
            key={choice}
            className="flex items-center gap-3 rounded-[var(--radius-atelier)] border border-[var(--border)] p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-subtle)]"
          >
            <input
              type="checkbox"
              checked={selected.has(i)}
              disabled={disabled}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(i);
                else next.delete(i);
                setSelected(next);
              }}
              className="size-4"
            />
            <span>{choice}</span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={disabled || selected.size === 0}>
        Valider
      </Button>
    </form>
  );
}

function TrueFalsePlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ value: boolean }> & {
  exercise: Extract<PublicExercise, { type: "QUIZ_TRUE_FALSE" }>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[var(--text)]">{exercise.statement}</p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onSubmit({ value: true })}
        >
          Vrai
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onSubmit({ value: false })}
        >
          Faux
        </Button>
      </div>
    </div>
  );
}

function MatchPlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ assignments: number[] }> & {
  exercise: Extract<PublicExercise, { type: "QUIZ_MATCH" }>;
}) {
  const rightOptions = React.useMemo(
    () => shuffled(exercise.pairs.map((pair, index) => ({ index, label: pair.right }))),
    [exercise.pairs],
  );
  const [assignments, setAssignments] = React.useState<(number | null)[]>(() =>
    exercise.pairs.map(() => null),
  );
  const complete = assignments.every((a) => a !== null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) onSubmit({ assignments });
      }}
    >
      {exercise.pairs.map((pair, leftIndex) => (
        <div key={pair.left} className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={`match-${exercise.slug}-${leftIndex}`}
            className="min-w-40 font-medium"
          >
            {pair.left}
          </label>
          <select
            id={`match-${exercise.slug}-${leftIndex}`}
            disabled={disabled}
            value={assignments[leftIndex] ?? ""}
            onChange={(e) => {
              const next = [...assignments];
              next[leftIndex] = e.target.value === "" ? null : Number(e.target.value);
              setAssignments(next);
            }}
            className="rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-sm"
          >
            <option value="">— choisir —</option>
            {rightOptions.map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <Button type="submit" disabled={disabled || !complete}>
        Valider
      </Button>
    </form>
  );
}

function OrderPlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ order: number[] }> & {
  exercise: Extract<PublicExercise, { type: "QUIZ_ORDER" }>;
}) {
  const [order, setOrder] = React.useState<{ originalIndex: number; text: string }[]>(
    () =>
      shuffled(exercise.items.map((text, originalIndex) => ({ originalIndex, text }))),
  );

  function move(position: number, direction: -1 | 1) {
    const target = position + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[position], next[target]] = [next[target]!, next[position]!];
    setOrder(next);
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ order: order.map((item) => item.originalIndex) });
      }}
    >
      <ol className="space-y-2">
        {order.map((item, position) => (
          <li
            key={item.originalIndex}
            data-original-index={item.originalIndex}
            className="flex items-center gap-3 rounded-[var(--radius-atelier)] border border-[var(--border)] p-3"
          >
            <span className="flex-1">{item.text}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || position === 0}
              onClick={() => move(position, -1)}
              aria-label={`Monter « ${item.text} »`}
            >
              <ChevronUp className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || position === order.length - 1}
              onClick={() => move(position, 1)}
              aria-label={`Descendre « ${item.text} »`}
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      <Button type="submit" disabled={disabled}>
        Valider l'ordre
      </Button>
    </form>
  );
}

function HotspotPlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ selectedIndices: number[] }> & {
  exercise: Extract<PublicExercise, { type: "HOTSPOT" }>;
}) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ selectedIndices: [...selected] });
      }}
    >
      {/* `role="group"`, pas `role="img"` : ce conteneur porte de vrais
          boutons interactifs — un rôle image ne peut pas avoir de
          descendants focalisables (axe-core, règle nested-interactive). */}
      <div
        role="group"
        aria-label={exercise.imageLabel}
        className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)]"
      >
        {exercise.zones.map((zone, i) => (
          <button
            key={zone.label}
            type="button"
            disabled={disabled}
            aria-pressed={selected.has(i)}
            aria-label={zone.label}
            onClick={() => toggle(i)}
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.radius * 2}%`,
              height: `${zone.radius * 2}%`,
            }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
              selected.has(i)
                ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                : "bg-[var(--surface-raised)]/70 border-[var(--border-strong)]",
            )}
          />
        ))}
      </div>
      {/* Liste équivalente, redondante avec le diagramme : garantit une
          sélection 100% clavier sans dépendre du focus sur des éléments
          positionnés en absolu. */}
      <fieldset className="space-y-2">
        <legend className="text-sm text-[var(--text-muted)]">
          Ou choisissez dans la liste :
        </legend>
        {exercise.zones.map((zone, i) => (
          <label key={zone.label} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={selected.has(i)}
              disabled={disabled}
              onChange={() => toggle(i)}
              className="size-4"
            />
            {zone.label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={disabled || selected.size === 0}>
        Valider
      </Button>
    </form>
  );
}

function PalettePlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ selectedIndices: number[] }> & {
  exercise: Extract<PublicExercise, { type: "PALETTE" }>;
}) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ selectedIndices: [...selected] });
      }}
    >
      <p className="text-[var(--text)]">{exercise.brief}</p>
      <div className="flex flex-wrap gap-3">
        {exercise.options.map((option, i) => (
          <button
            key={option.label}
            type="button"
            disabled={disabled}
            aria-pressed={selected.has(i)}
            onClick={() => {
              const next = new Set(selected);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              setSelected(next);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-[var(--radius-atelier)] border-2 p-2",
              selected.has(i) ? "border-[var(--accent)]" : "border-transparent",
            )}
          >
            <span
              className="size-12 rounded-full border border-[var(--border)]"
              style={{ backgroundColor: option.hex }}
              aria-hidden="true"
            />
            <span className="text-xs">{option.label}</span>
          </button>
        ))}
      </div>
      <Button type="submit" disabled={disabled || selected.size === 0}>
        Valider
      </Button>
    </form>
  );
}

function MaterialChoicePlayer({
  exercise,
  onSubmit,
  disabled,
}: TypedPlayerProps<{ selectedIndex: number }> & {
  exercise: Extract<PublicExercise, { type: "MATERIAL_CHOICE" }>;
}) {
  const [selected, setSelected] = React.useState<number | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected !== null) onSubmit({ selectedIndex: selected });
      }}
    >
      <p className="text-[var(--text)]">{exercise.scenario}</p>
      <fieldset className="space-y-2">
        <legend className="sr-only">{exercise.prompt}</legend>
        {exercise.options.map((option, i) => (
          <label
            key={option.label}
            className="flex items-start gap-3 rounded-[var(--radius-atelier)] border border-[var(--border)] p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-subtle)]"
          >
            <input
              type="radio"
              name={`materiau-${exercise.slug}`}
              checked={selected === i}
              disabled={disabled}
              onChange={() => setSelected(i)}
              className="mt-1 size-4"
            />
            <span>
              <span className="font-medium">{option.label}</span>
              <br />
              <span className="text-sm text-[var(--text-muted)]">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={disabled || selected === null}>
        Valider
      </Button>
    </form>
  );
}

export function ExercisePlayer({
  exerciseId,
  exercise,
}: {
  exerciseId: string;
  exercise: PublicExercise;
}) {
  const [result, setResult] = React.useState<SubmitExerciseResult | null>(null);
  const [pending, setPending] = React.useState(false);

  function handleSubmit(answer: unknown) {
    setPending(true);
    void submitExerciseAction(exerciseId, answer).then((outcome) => {
      setResult(outcome);
      setPending(false);
    });
  }

  const disabled = pending || (result?.ok ?? false);

  return (
    <div
      data-exercise-slug={exercise.slug}
      className="space-y-4 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5"
    >
      <p className="font-medium text-[var(--text)]">{exercise.prompt}</p>

      {exercise.type === "QUIZ_MCQ" && (
        <McqPlayer exercise={exercise} onSubmit={handleSubmit} disabled={disabled} />
      )}
      {exercise.type === "QUIZ_TRUE_FALSE" && (
        <TrueFalsePlayer
          exercise={exercise}
          onSubmit={handleSubmit}
          disabled={disabled}
        />
      )}
      {exercise.type === "QUIZ_MATCH" && (
        <MatchPlayer exercise={exercise} onSubmit={handleSubmit} disabled={disabled} />
      )}
      {exercise.type === "QUIZ_ORDER" && (
        <OrderPlayer exercise={exercise} onSubmit={handleSubmit} disabled={disabled} />
      )}
      {exercise.type === "HOTSPOT" && (
        <HotspotPlayer exercise={exercise} onSubmit={handleSubmit} disabled={disabled} />
      )}
      {exercise.type === "PALETTE" && (
        <PalettePlayer exercise={exercise} onSubmit={handleSubmit} disabled={disabled} />
      )}
      {exercise.type === "MATERIAL_CHOICE" && (
        <MaterialChoicePlayer
          exercise={exercise}
          onSubmit={handleSubmit}
          disabled={disabled}
        />
      )}

      {result ? <ResultBanner result={result} /> : null}
    </div>
  );
}
