"use client";

import * as React from "react";
import { cn } from "@atelier/ui";

/**
 * Volet glissant avant/après (docs/03 §5 — `BeforeAfterSlider`), tactile et
 * clavier (docs/03 §6, point 3 : tout glisser-déposer a une alternative
 * clavier). Réutilisable au-delà de l'atelier — l'analyse photo (M6) en aura
 * aussi besoin.
 */
export function BeforeAfterSlider({
  before,
  after,
  beforeLabel = "Avant",
  afterLabel = "Après",
  defaultValue = 50,
  className,
}: {
  before: React.ReactNode;
  after: React.ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  defaultValue?: number;
  className?: string;
}) {
  const [percent, setPercent] = React.useState(defaultValue);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  const setFromClientX = React.useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, next)));
  }, []);

  React.useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      setFromClientX(e.clientX);
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPercent((p) => Math.max(0, p - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPercent((p) => Math.min(100, p + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPercent(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPercent(100);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative touch-none overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)]",
        className,
      )}
    >
      <div className="absolute inset-0" aria-hidden={percent >= 100}>
        {after}
      </div>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        aria-hidden={percent <= 0}
      >
        {before}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={`Comparateur ${beforeLabel} / ${afterLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${Math.round(percent)} % ${beforeLabel}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          draggingRef.current = true;
          setFromClientX(e.clientX);
        }}
        className="absolute inset-y-0 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center focus-visible:outline-none"
        style={{ left: `${percent}%` }}
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[var(--accent)]" />
        <span className="relative flex size-8 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--surface-raised)] text-xs font-medium shadow-[var(--shadow-1)]">
          ⇔
        </span>
      </div>

      <span className="bg-[var(--surface-raised)]/90 pointer-events-none absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium">
        {beforeLabel}
      </span>
      <span className="bg-[var(--surface-raised)]/90 pointer-events-none absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium">
        {afterLabel}
      </span>
    </div>
  );
}
