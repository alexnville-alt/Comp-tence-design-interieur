"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoomAction } from "./actions";
import { ROOM_TYPE_LABELS } from "./room-type-labels";
import { ROOM_TYPES } from "./room-types";

export function CreateRoomForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<(typeof ROOM_TYPES)[number]>("LIVING");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || pending) return;
    setPending(true);
    try {
      const { id } = await createRoomAction(projectId, name, type);
      router.push(`/atelier/${projectId}/${id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-wrap items-end gap-2"
    >
      <div>
        <Label htmlFor="room-name">Nouvelle pièce</Label>
        <Input
          id="room-name"
          placeholder="Salon"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="room-type">Type</Label>
        <select
          id="room-type"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof ROOM_TYPES)[number])}
          className="flex h-11 rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text)]"
        >
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {ROOM_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending || !name.trim()}>
        Créer
      </Button>
    </form>
  );
}
