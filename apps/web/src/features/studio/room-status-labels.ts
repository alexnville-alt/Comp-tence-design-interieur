import type { ROOM_STATUSES } from "./room-statuses";

export const ROOM_STATUS_LABELS: Record<(typeof ROOM_STATUSES)[number], string> = {
  TO_MEASURE: "À mesurer",
  TO_DESIGN: "À concevoir",
  IN_PROGRESS: "En cours",
  VALIDATED: "Validée",
  DONE: "Terminée",
};
