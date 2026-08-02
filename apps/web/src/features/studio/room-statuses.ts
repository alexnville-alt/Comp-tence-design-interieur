/**
 * Séparé de `actions.ts` : un fichier `"use server"` ne peut exporter que des
 * fonctions async (Next.js) — cette constante doit vivre ailleurs pour être
 * importée à la fois par le serveur (validation) et le client (formulaire).
 * Même principe que `room-types.ts` (M4).
 */
export const ROOM_STATUSES = [
  "TO_MEASURE",
  "TO_DESIGN",
  "IN_PROGRESS",
  "VALIDATED",
  "DONE",
] as const;
