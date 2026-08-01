import type { LibraryItemFrontmatter } from "./schema";

/**
 * Contrôle d'intégrité du graphe de relations (docs/05 M7, critère
 * d'acceptation « les relations sont bidirectionnellement cohérentes »).
 *
 * Les relations sont déclarées **une fois par fiche source**, dans un sens ;
 * la fiche cible doit déclarer la relation réciproque explicitement — rien
 * n'est déduit automatiquement à la synchronisation, pour que le frontmatter
 * MDX reste la seule source de vérité (ADR-0010) et qu'une réciproque
 * oubliée soit une erreur de contenu détectée ici, pas un trou silencieux
 * dans le graphe.
 *
 * `PAIRS_WITH`, `AVOID_WITH`, `SAME_FAMILY` sont symétriques : si A la
 * déclare vers B, B doit la déclarer vers A. `CHEAPER_ALT`/`PREMIUM_ALT`
 * forment un couple inverse : si A déclare B en alternative moins chère, B
 * doit déclarer A en alternative plus haut de gamme.
 */
export function checkRelationSymmetry(
  items: readonly LibraryItemFrontmatter[],
): string[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const errors: string[] = [];

  function requireSymmetric(field: "pairsWith" | "avoidWith" | "sameFamily") {
    for (const item of items) {
      for (const targetSlug of item[field]) {
        const target = bySlug.get(targetSlug);
        if (!target) {
          errors.push(
            `« ${item.slug} » référence « ${targetSlug} » (${field}), fiche introuvable.`,
          );
          continue;
        }
        if (!target[field].includes(item.slug)) {
          errors.push(
            `« ${item.slug} » déclare ${field} vers « ${targetSlug} », mais « ${targetSlug} » ne déclare pas la réciproque.`,
          );
        }
      }
    }
  }

  function requireInverse(
    field: "cheaperAlt" | "premiumAlt",
    inverseField: "cheaperAlt" | "premiumAlt",
  ) {
    for (const item of items) {
      for (const targetSlug of item[field]) {
        const target = bySlug.get(targetSlug);
        if (!target) {
          errors.push(
            `« ${item.slug} » référence « ${targetSlug} » (${field}), fiche introuvable.`,
          );
          continue;
        }
        if (!target[inverseField].includes(item.slug)) {
          errors.push(
            `« ${item.slug} » déclare ${field} vers « ${targetSlug} », mais « ${targetSlug} » ne déclare pas ${inverseField} vers « ${item.slug} ».`,
          );
        }
      }
    }
  }

  requireSymmetric("pairsWith");
  requireSymmetric("avoidWith");
  requireSymmetric("sameFamily");
  requireInverse("cheaperAlt", "premiumAlt");
  requireInverse("premiumAlt", "cheaperAlt");

  return errors;
}
