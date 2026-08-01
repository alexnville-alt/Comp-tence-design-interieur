"use client";

import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { requestPasswordResetAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialState);

  // Le message de succès est volontairement identique que le compte existe ou
  // non : c'est ce qui empêche d'utiliser ce formulaire pour découvrir quelles
  // adresses sont inscrites.
  if (state.success) {
    return <Alert tone="success">{state.success}</Alert>;
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        hint="Nous vous enverrons un lien valable une heure."
        error={state.fieldErrors?.email}
      />

      <SubmitButton className="w-full" pendingLabel="Envoi…">
        Envoyer le lien
      </SubmitButton>
    </form>
  );
}
