import { z } from "zod";

/**
 * Fiches « intérieurs célèbres » (docs/06 §4.2, M11).
 *
 * Grille d'analyse commune aux 12 études — jamais une image sous droits :
 * `docs/06` est explicite (« illustrées par des schémas redessinés, jamais
 * par des photographies sous droits »). Cette livraison va plus loin dans la
 * prudence : aucun pipeline d'illustration n'existe dans ce projet (les
 * fiches bibliothèque, M7, n'ont elles-mêmes aucune image, docs/04 §3.8), donc
 * la grille reste entièrement textuelle plutôt que de risquer un schéma
 * approximatif faussement présenté comme fidèle — voir la note de périmètre
 * dans le README.
 *
 * `externalLink` (post-M12) contourne cette même contrainte de droits sans y
 * renoncer : un lien sortant vers une page qui présente le lieu (photos
 * incluses) n'héberge ni ne reproduit rien nous-mêmes — la fiche ne fait que
 * pointer vers une source existante, à charge pour elle d'être en règle sur
 * ses propres images.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .min(1, "Le slug ne peut pas être vide.")
  .regex(
    SLUG_PATTERN,
    "Le slug doit être en minuscules, sans accents ni espaces (ex. « villa-savoye »).",
  );

export const FamousInteriorFrontmatterSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1, "Le nom ne peut pas être vide."),
  architect: z.string().trim().min(1, "L'architecte ne peut pas être vide."),
  year: z.string().trim().min(1, "L'année ne peut pas être vide."),
  location: z.string().trim().min(1, "Le lieu ne peut pas être vide."),
  context: z.string().trim().min(1, "Le contexte ne peut pas être vide."),
  /** Le parti pris architectural — docs/06 §4.2. */
  designIntent: z.string().trim().min(1, "Le parti pris ne peut pas être vide."),
  light: z.string().trim().min(1, "La description de la lumière ne peut pas être vide."),
  materials: z.string().trim().min(1, "Les matériaux ne peuvent pas être vides."),
  circulation: z.string().trim().min(1, "La circulation ne peut pas être vide."),
  /** Ce qu'on peut en retenir chez soi — docs/06 §4.2, toujours au moins un point. */
  takeaways: z
    .array(z.string().trim().min(1))
    .min(1, "Au moins un point à retenir est requis."),
  order: z.number().int().nonnegative().default(0),
  /** Facultatif : page présentant le lieu (photos, contexte) — jamais hébergé ici. */
  externalLink: z.string().trim().url("Le lien doit être une URL valide.").optional(),
});

export type FamousInteriorFrontmatter = z.infer<typeof FamousInteriorFrontmatterSchema>;
