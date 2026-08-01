"use client";

import { useActionState } from "react";
import { WEEKLY_PRESETS } from "@atelier/domain";
import { Field, SubmitButton } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { updateProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

const THEMES = [
  { value: "SYSTEM", label: "Suivre le système" },
  { value: "LIGHT", label: "Clair" },
  { value: "DARK", label: "Sombre" },
] as const;

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    theme: string;
    weeklyMinutes: number;
    reducedMotion: boolean;
    soundEnabled: boolean;
  };
}) {
  const [state, action] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Prénom" name="name" defaultValue={defaults.name} maxLength={80} />

      <div className="space-y-1.5">
        <Label htmlFor="theme">Thème</Label>
        <select
          id="theme"
          name="theme"
          defaultValue={defaults.theme}
          className="h-11 w-full rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          {THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="weeklyMinutes">Objectif hebdomadaire</Label>
        <select
          id="weeklyMinutes"
          name="weeklyMinutes"
          defaultValue={String(defaults.weeklyMinutes)}
          className="h-11 w-full rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          {WEEKLY_PRESETS.map((preset) => (
            <option key={preset.minutes} value={preset.minutes}>
              {preset.label} — {preset.hint}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Confort</legend>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="reducedMotion"
            defaultChecked={defaults.reducedMotion}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            Réduire les animations
            <span className="block text-xs text-[var(--text-muted)]">
              S'ajoute au réglage de votre système, sans le remplacer.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="soundEnabled"
            defaultChecked={defaults.soundEnabled}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            Sons de réussite
            <span className="block text-xs text-[var(--text-muted)]">
              Désactivés par défaut.
            </span>
          </span>
        </label>
      </fieldset>

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  );
}
