import * as React from "react";
import { cn } from "@atelier/ui";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Champ de saisie.
 *
 * La bordure utilise `--border-strong` et non `--border` : WCAG 1.4.11 exige
 * un contraste de 3:1 pour délimiter un composant d'interface. Un champ dont
 * la bordure est un gris clair décoratif est invalide.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-base text-[var(--text)]",
        "placeholder:text-[var(--text-muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-[var(--danger)] aria-[invalid=true]:ring-[var(--danger)]",
        className,
      )}
      {...props}
    />
  );
});
