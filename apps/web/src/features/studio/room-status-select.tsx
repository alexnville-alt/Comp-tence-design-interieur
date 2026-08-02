"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateRoomStatusAction } from "./actions";
import { ROOM_STATUSES } from "./room-statuses";
import { ROOM_STATUS_LABELS } from "./room-status-labels";

/** Sélecteur d'état d'avancement d'une pièce (docs/05 M10, PROJ-05). */
export function RoomStatusSelect({
  roomId,
  initialStatus,
}: {
  roomId: string;
  initialStatus: (typeof ROOM_STATUSES)[number];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(initialStatus);
  const [pending, setPending] = React.useState(false);

  async function handleChange(next: (typeof ROOM_STATUSES)[number]) {
    const previous = status;
    setStatus(next);
    setPending(true);
    try {
      await updateRoomStatusAction(roomId, next);
      router.refresh();
    } catch {
      setStatus(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      État
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          void handleChange(e.target.value as (typeof ROOM_STATUSES)[number])
        }
        className="rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-50"
      >
        {ROOM_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ROOM_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
