"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { JOURNAL_KINDS, JOURNAL_KIND_LABELS, type JournalKind } from "@atelier/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JournalEntryView } from "./data";
import { createJournalEntryAction, deleteJournalEntryAction } from "./journal-actions";

/**
 * Journal de projet (docs/05 M10, PROJ-07) — c'est aussi la mémoire que le
 * mode « architecte accompagnateur » (tâche suivante) injecte dans le
 * système de chat : une contrainte n'est retenue que si elle est journalisée
 * ici, jamais devinée depuis l'historique de conversation.
 */
export function JournalPanel({
  projectId,
  initialEntries,
}: {
  projectId: string;
  initialEntries: JournalEntryView[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [kind, setKind] = React.useState<JournalKind>("NOTE");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createJournalEntryAction(projectId, { title, body, kind });
      if (!result.ok) {
        setError(result.error ?? "Une erreur est survenue.");
        return;
      }
      setTitle("");
      setBody("");
      setKind("NOTE");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDelete(id);
    try {
      await deleteJournalEntryAction(id);
      router.refresh();
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="journal-title">Titre</Label>
            <Input
              id="journal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="journal-kind">Type</Label>
            <select
              id="journal-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as JournalKind)}
              className="rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm text-[var(--text)]"
            >
              {JOURNAL_KINDS.map((k) => (
                <option key={k} value={k}>
                  {JOURNAL_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="journal-body">Contenu</Label>
          <textarea
            id="journal-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            className="w-full rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter au journal"}
        </Button>
      </form>

      {initialEntries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Le journal de ce projet est vide pour l'instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {initialEntries.map((entry) => (
            <li
              key={entry.id}
              className="space-y-1 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                    {JOURNAL_KIND_LABELS[entry.kind]}
                  </span>
                  <span className="font-medium text-[var(--text)]">{entry.title}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pendingDelete === entry.id}
                  onClick={() => void handleDelete(entry.id)}
                >
                  Supprimer
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                {entry.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
