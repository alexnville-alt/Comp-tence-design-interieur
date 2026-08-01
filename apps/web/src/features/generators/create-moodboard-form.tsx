"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateMoodboardAction } from "./moodboard-actions";

/**
 * Déclenche la génération IA d'un moodboard (docs/05 M8). La pièce est
 * optionnelle — sans elle, la recherche de candidats (`gatherCandidates`)
 * n'est pas filtrée par `bestFor`, ce qui reste une exploration valide.
 */
export function CreateMoodboardForm({
  projectId,
  rooms,
}: {
  projectId: string;
  rooms: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [roomId, setRoomId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await generateMoodboardAction(
        projectId,
        title.trim(),
        roomId || undefined,
      );
      if (!result.ok || !result.moodboardId) {
        setError(result.message ?? "La génération a échoué. Réessayez.");
        return;
      }
      router.push(`/atelier/${projectId}/moodboards/${result.moodboardId}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5"
    >
      <h2 className="text-lg">Générer un moodboard</h2>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="moodboard-title">Titre</Label>
          <Input
            id="moodboard-title"
            placeholder="Ambiance salon scandinave"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="moodboard-room">Pièce (optionnel)</Label>
          <select
            id="moodboard-room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="flex h-11 rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text)]"
          >
            <option value="">Aucune — exploration libre</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending || !title.trim()}>
          {pending ? "Génération…" : "Générer"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
