"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SubmitButton } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { deleteAccountAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

/**
 * Suppression de compte.
 *
 * Deux garde-fous délibérés sur une action irréversible : le formulaire est
 * replié par défaut, et la confirmation exige de retaper son adresse e-mail.
 * Une case à cocher se coche par réflexe ; retaper une adresse demande une
 * intention.
 */
export function DangerZone({ email }: { email: string }) {
  const [state, action] = useActionState(deleteAccountAction, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-muted)]">
          La suppression retire immédiatement l'accès à votre compte et à votre
          progression. Les données sont définitivement effacées après 30 jours.
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Supprimer mon compte
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Alert tone="danger" title="Cette action est irréversible">
        Votre progression, vos préférences et vos projets seront perdus. Pensez à exporter
        vos données avant de continuer.
      </Alert>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field
        label="Confirmez en saisissant votre adresse e-mail"
        name="confirmation"
        type="email"
        autoComplete="off"
        placeholder={email}
        required
      />

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <SubmitButton variant="danger" pendingLabel="Suppression…">
          Supprimer définitivement
        </SubmitButton>
      </div>
    </form>
  );
}
