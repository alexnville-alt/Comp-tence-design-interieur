"use client";

import { checkPassword, PASSWORD_ISSUE_MESSAGES } from "@atelier/domain";
import { cn } from "@atelier/ui";

const LABELS = ["Très faible", "Faible", "Correct", "Bon", "Excellent"] as const;

const BAR_COLORS = [
  "bg-[var(--danger)]",
  "bg-[var(--danger)]",
  "bg-[var(--warning)]",
  "bg-[var(--success)]",
  "bg-[var(--success)]",
] as const;

/**
 * Jauge de robustesse du mot de passe.
 *
 * Elle utilise exactement la même fonction que la validation serveur
 * (`@atelier/domain`) : l'utilisateur ne peut donc jamais voir « Excellent »
 * sur un mot de passe que le serveur refusera. C'est tout l'intérêt d'avoir
 * isolé les règles métier dans un paquet exécutable des deux côtés (ADR-0009).
 *
 * La force est indiquée par un libellé **en plus** de la couleur : la couleur
 * seule ne peut pas porter l'information (WCAG 1.4.1).
 */
export function PasswordStrength({
  password,
  email,
}: {
  password: string;
  email?: string;
}) {
  if (!password) return null;

  const { strength, issues, valid } = checkPassword(password, email);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < strength ? BAR_COLORS[strength] : "bg-[var(--border)]",
            )}
          />
        ))}
      </div>

      {/* `aria-live="polite"` : l'évolution est annoncée sans interrompre
          la saisie en cours. */}
      <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
        Robustesse : {LABELS[strength]}
        {!valid && issues.length > 0 ? (
          <span className="text-[var(--danger)]">
            {" — "}
            {PASSWORD_ISSUE_MESSAGES[issues[0]!]}
          </span>
        ) : null}
      </p>
    </div>
  );
}
