import { z } from "zod";

/**
 * Journal de projet (docs/05 M10, PROJ-07) : notes, décisions, questions
 * ouvertes, lignes de budget. Schéma de validation à l'écriture — la lecture
 * n'a besoin d'aucune règle métier au-delà de ce que Prisma renvoie déjà
 * typé, donc pas de schéma de lecture séparé (même choix que les autres
 * entrées CRUD simples du projet).
 */
export const JOURNAL_KINDS = ["NOTE", "DECISION", "QUESTION", "BUDGET"] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  NOTE: "Note",
  DECISION: "Décision",
  QUESTION: "Question ouverte",
  BUDGET: "Budget",
};

export const JournalEntryInputSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200),
  body: z.string().trim().min(1, "Le contenu est obligatoire.").max(5000),
  kind: z.enum(JOURNAL_KINDS).default("NOTE"),
});
export type JournalEntryInput = z.infer<typeof JournalEntryInputSchema>;
