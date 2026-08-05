"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@atelier/ui";
import { Button } from "@/components/ui/button";
import { completeLessonAction, saveLessonProgressAction } from "./progress-actions";

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Suivi de progression d'une leçon (docs/05 M2 — « reprise exacte »).
 *
 * Le suivi est **passif** : un `IntersectionObserver` détecte le bloc le
 * plus loin atteint pendant la lecture, sans action explicite de
 * l'apprenant. La sauvegarde est débouncée pour ne pas déclencher une
 * Server Action à chaque pixel de défilement, et un dernier appel est forcé
 * au démontage / à la fermeture de l'onglet (`pagehide`) pour ne pas perdre
 * les derniers blocs lus.
 *
 * `document.body.dataset.lastSavedBlock` est un point d'ancrage
 * délibérément posé pour les tests E2E (Playwright `waitForFunction`) :
 * observer une sauvegarde réseau serait flaky, un attribut DOM stable ne
 * l'est pas.
 */
export function LessonProgressTracker({
  lessonId,
  blockCount,
  initialBlockIndex,
  initialCompleted,
  nextHref,
  nextLabel,
}: {
  lessonId: string;
  blockCount: number;
  initialBlockIndex: number;
  initialCompleted: boolean;
  nextHref: string;
  nextLabel: string;
}) {
  const [furthest, setFurthest] = useState(initialBlockIndex);
  const [completed, setCompleted] = useState(initialCompleted);
  const [showResume, setShowResume] = useState(
    initialBlockIndex > 0 && initialBlockIndex < blockCount && !initialCompleted,
  );
  const [isPending, startTransition] = useTransition();

  const furthestRef = useRef(furthest);
  furthestRef.current = furthest;
  const lastSavedRef = useRef(initialBlockIndex);
  const sessionStartRef = useRef(Date.now());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(blockIndex: number) {
    if (blockIndex <= lastSavedRef.current) return;
    const timeSpentMs = Date.now() - sessionStartRef.current;
    sessionStartRef.current = Date.now();
    lastSavedRef.current = blockIndex;
    startTransition(() => {
      void saveLessonProgressAction({ lessonId, blockIndex, timeSpentMs }).then(
        (result) => {
          if (result.ok) {
            document.body.dataset.lastSavedBlock = String(result.blockIndex);
          }
        },
      );
    });
  }

  // Reprise exacte : on rouvre directement au bloc quitté, sans attendre une
  // action de l'apprenant — la bannière ne fait que confirmer où il se trouve.
  useEffect(() => {
    if (initialBlockIndex <= 0 || initialBlockIndex >= blockCount || initialCompleted)
      return;
    const target = document.getElementById(`bloc-${initialBlockIndex}`);
    target?.scrollIntoView({ behavior: "auto", block: "start" });
    document.body.dataset.resumedAtBlock = String(initialBlockIndex);
    // Ne dépend que du chargement initial de la leçon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (completed) return;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-block-index]"),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const n = Number(entry.target.getAttribute("data-block-index"));
          if (!Number.isFinite(n) || n <= furthestRef.current) continue;
          furthestRef.current = n;
          setFurthest(n);
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => save(n), SAVE_DEBOUNCE_MS);
        }
      },
      { threshold: 0.5 },
    );

    for (const el of elements) observer.observe(el);

    const handlePageHide = () => save(furthestRef.current);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      observer.disconnect();
      window.removeEventListener("pagehide", handlePageHide);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      save(furthestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  function handleComplete() {
    startTransition(() => {
      void completeLessonAction({ lessonId }).then((result) => {
        if (result.ok) setCompleted(true);
      });
    });
  }

  return (
    <div className="space-y-4">
      {showResume ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-atelier)] border border-[var(--accent)] bg-[var(--accent-subtle)] p-4 text-sm text-[var(--text)]"
        >
          <p>
            Vous reprenez au bloc {initialBlockIndex}, là où vous vous étiez arrêté·e.
          </p>
          <button
            type="button"
            onClick={() => setShowResume(false)}
            aria-label="Fermer ce message"
            className="rounded-[var(--radius-atelier)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div
        role="img"
        aria-label={`Progression : bloc ${Math.min(furthest, blockCount)} sur ${blockCount}`}
        className="flex items-center gap-1.5"
      >
        {Array.from({ length: blockCount }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            aria-hidden="true"
            className={cn(
              "h-1.5 flex-1 rounded-full",
              n <= furthest || completed ? "bg-[var(--accent)]" : "bg-[var(--border)]",
            )}
          />
        ))}
      </div>

      {completed ? (
        <div className="space-y-3">
          <div
            role="status"
            className="flex items-center gap-2 rounded-[var(--radius-atelier)] border border-[var(--success)] bg-[var(--success-subtle)] p-4 text-sm text-[var(--text)]"
          >
            <CheckCircle2
              className="size-5 shrink-0 text-[var(--success)]"
              aria-hidden="true"
            />
            <p>Leçon terminée.</p>
          </div>
          <Button asChild>
            <Link href={nextHref}>{nextLabel}</Link>
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={handleComplete} disabled={isPending}>
          Marquer comme terminée
        </Button>
      )}
    </div>
  );
}
