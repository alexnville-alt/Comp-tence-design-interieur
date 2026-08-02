"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectSettingsAction } from "./settings-actions";

/** Adresse et budget du projet (docs/05 M10, PROJ-01/08). */
export function ProjectSettingsForm({
  projectId,
  initialAddress,
  initialBudgetCents,
}: {
  projectId: string;
  initialAddress: string | null;
  initialBudgetCents: number | null;
}) {
  const router = useRouter();
  const [address, setAddress] = React.useState(initialAddress ?? "");
  const [budget, setBudget] = React.useState(
    initialBudgetCents != null ? String(initialBudgetCents / 100) : "",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const budgetEuros = budget.trim() ? Number(budget) : null;
      await updateProjectSettingsAction(projectId, address, budgetEuros);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="grid gap-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="project-address">Adresse du logement</Label>
        <Input
          id="project-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex. 12 rue des Lilas, Lyon"
        />
      </div>
      <div>
        <Label htmlFor="project-budget">Budget estimé (€, ordre de grandeur)</Label>
        <Input
          id="project-budget"
          type="number"
          min={0}
          step="1"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {saved ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-[var(--text-muted)]"
          >
            Enregistré.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
