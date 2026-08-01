import type { ROOM_TYPES } from "./room-types";

export const ROOM_TYPE_LABELS: Record<(typeof ROOM_TYPES)[number], string> = {
  KITCHEN: "Cuisine",
  BATHROOM: "Salle de bain",
  LIVING: "Séjour",
  BEDROOM: "Chambre",
  OFFICE: "Bureau",
  HALL: "Entrée / couloir",
  OUTDOOR: "Extérieur",
  OTHER: "Autre",
};
