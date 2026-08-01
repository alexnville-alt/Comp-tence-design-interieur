"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { signInAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export function SignInForm({ notice }: { notice?: string | undefined }) {
  const [state, action] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="space-y-5" noValidate>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      <div className="space-y-1.5">
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
        <Link
          href="/mot-de-passe-oublie"
          className="inline-block text-xs text-[var(--accent)] underline underline-offset-4"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
