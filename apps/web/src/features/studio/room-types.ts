/**
 * Séparé de `actions.ts` : un fichier `"use server"` ne peut exporter que des
 * fonctions async (Next.js) — cette constante doit vivre ailleurs pour être
 * importée à la fois par le serveur (validation) et le client (formulaire).
 */
export const ROOM_TYPES = [
  "KITCHEN",
  "BATHROOM",
  "LIVING",
  "BEDROOM",
  "OFFICE",
  "HALL",
  "OUTDOOR",
  "OTHER",
] as const;
