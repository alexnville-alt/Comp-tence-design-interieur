"use client";

import { useActionState, useState } from "react";
import { Field, SubmitButton } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { PASSWORD_MIN_LENGTH } from "@atelier/domain";
import { resetPasswordAction, type ActionState } from "./actions";
import { PasswordStrength } from "./password-strength";

const initialState: ActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="space-y-2">
        <Field
          label="Nouveau mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={state.fieldErrors?.password}
        />
        <PasswordStrength password={password} />
      </div>

      <Alert tone="info">
        Par sécurité, définir un nouveau mot de passe vous déconnectera de tous vos autres
        appareils.
      </Alert>

      <SubmitButton className="w-full" pendingLabel="Enregistrement…">
        Définir le nouveau mot de passe
      </SubmitButton>
    </form>
  );
}
