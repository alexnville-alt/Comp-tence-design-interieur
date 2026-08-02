import { cn } from "@atelier/ui";

/**
 * Barre de progression générique. `label` sert de nom accessible
 * (`aria-label`) — jamais de barre sans texte équivalent (WCAG 1.1.1).
 */
export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const clamped = max > 0 ? Math.min(Math.max(value, 0), max) : 0;
  const percent = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-[var(--border)]",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
