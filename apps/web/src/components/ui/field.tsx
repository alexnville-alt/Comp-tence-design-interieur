"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Label } from "./label";
import { Input, type InputProps } from "./input";
import { Button, type ButtonProps } from "./button";
import { cn } from "@atelier/ui";

/**
 * Champ de formulaire complet : libellé, saisie, aide, erreur.
 *
 * Le câblage d'accessibilité est fait ici une fois pour toutes plutôt que
 * répété dans chaque formulaire : `aria-describedby` relie l'aide et l'erreur
 * au champ, `aria-invalid` signale l'état. Répété à la main, ce câblage est
 * systématiquement oublié quelque part.
 */
export function Field({
  label,
  name,
  hint,
  error,
  className,
  ...inputProps
}: InputProps & {
  label: string;
  name: string;
  hint?: string;
  error?: string | undefined;
}) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Bouton de soumission qui se désactive pendant l'envoi.
 *
 * `useFormStatus` donne l'état du formulaire parent sans state manuel ni
 * prop à faire descendre — et surtout, il empêche la double soumission, qui
 * créerait deux comptes ou enverrait deux e-mails.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? "Envoi…") : children}
    </Button>
  );
}
