"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { RATING_LABELS, RATINGS, type ReviewRating } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { Button } from "@/components/ui/button";
import { reviewCardAction } from "./actions";
import type { QueueCard } from "./queue";

/**
 * Session de révision (docs/05 M3).
 *
 * Entièrement pilotable au clavier : `Espace`/`Entrée` retourne la carte,
 * les touches `1` à `4` notent — la souris n'est jamais requise, ce qui est
 * le critère d'acceptation explicite de la feuille de route pour ce module.
 */
export function ReviewSession({ queue }: { queue: QueueCard[] }) {
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const card = queue[index];
  const finished = index >= queue.length;

  const rate = React.useCallback(
    (rating: ReviewRating) => {
      if (!card || pending) return;
      setPending(true);
      void reviewCardAction(card.cardId, rating).then(() => {
        setPending(false);
        setRevealed(false);
        setIndex((i) => i + 1);
      });
    },
    [card, pending],
  );

  React.useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (finished) return;
      if ((e.key === " " || e.key === "Enter") && !revealed) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key) as ReviewRating);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [revealed, finished, rate]);

  if (queue.length === 0) {
    return (
      <div className="rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center text-[var(--text-muted)]">
        Aucune carte à réviser aujourd'hui.
      </div>
    );
  }

  if (finished) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-[var(--radius-atelier)] border border-[var(--success)] bg-[var(--success-subtle)] p-8 text-center"
      >
        <CheckCircle2 className="size-8 text-[var(--success)]" aria-hidden="true" />
        <p className="font-medium text-[var(--text)]">
          Session terminée — {queue.length} carte{queue.length > 1 ? "s" : ""} révisée
          {queue.length > 1 ? "s" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-[var(--text-muted)]" aria-live="polite">
        Carte {index + 1} / {queue.length}
      </p>

      <button
        type="button"
        onClick={() => setRevealed(true)}
        disabled={revealed}
        aria-label={revealed ? "Recto de la carte" : "Afficher le verso de la carte"}
        className={cn(
          "flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center text-lg",
          !revealed && "cursor-pointer hover:border-[var(--border-strong)]",
        )}
      >
        <p className="font-[family-name:var(--font-display)] text-xl">{card!.front}</p>
        {revealed ? (
          <p className="border-t border-[var(--border)] pt-3 text-[var(--text-muted)]">
            {card!.back}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Appuyez sur Espace ou Entrée pour révéler la réponse.
          </p>
        )}
      </button>

      {revealed ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RATINGS.map((rating) => (
            <Button
              key={rating}
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => rate(rating)}
            >
              {rating} · {RATING_LABELS[rating]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
