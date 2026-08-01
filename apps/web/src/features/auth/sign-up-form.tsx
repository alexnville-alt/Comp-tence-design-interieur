"use client";

import { useActionState, useState } from "react";
import { Field, SubmitButton } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { PASSWORD_MIN_LENGTH } from "@atelier/domain";
import { signUpAction, type ActionState } from "./actions";
import { PasswordStrength } from "./password-strength";

const initialState: ActionState = {};

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialState);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field
        label="Prénom"
        name="name"
        autoComplete="given-name"
        required
        error={state.fieldErrors?.name}
      />

      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={state.fieldErrors?.email}
      />

      <div className="space-y-2">
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères. Une phrase courte fait un excellent mot de passe.`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={state.fieldErrors?.password}
        />
        <PasswordStrength password={password} email={email} />
      </div>

      <SubmitButton className="w-full" pendingLabel="Création du compte…">
        Créer mon compte
      </SubmitButton>

      <p className="text-xs text-[var(--text-muted)]">
        En créant un compte, vous acceptez que vos données de progression soient
        conservées pour vous permettre de reprendre votre parcours. Vous pouvez les
        exporter ou les supprimer à tout moment depuis votre profil.
      </p>
    </form>
  );
}
