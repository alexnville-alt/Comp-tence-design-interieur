import type { FurnitureItem } from "../geometry/scene-schema";

/**
 * Liste de mobilier dimensionnée (docs/05 M8) — agrège le mobilier réellement
 * posé dans une pièce (`RoomVersion.sceneData.furniture[]`, M4) en un rapport
 * groupé par pièce identique plutôt qu'une ligne par instance : une pièce qui
 * a quatre chaises identiques donne « Chaise × 4 », pas quatre lignes.
 *
 * Fonction pure — aucun accès base ni réseau : `librarySlugs` est fourni par
 * l'appelant (déjà interrogé depuis `LibraryItem`), ce qui permet de tester
 * l'agrégation sans Postgres, comme le reste de ce paquet (ADR-0009).
 * `FurnitureItem.catalogRef` peut pointer soit vers `FURNITURE_CATALOG`
 * (stopgap M4), soit vers `LibraryItem.slug` (M7) — cette fonction ne
 * tranche pas laquelle, elle expose juste si le `catalogRef` correspond à
 * une fiche bibliothèque existante (`linkedToLibrary`), ce qui satisfait le
 * critère d'acceptation « tout élément généré est relié à une fiche
 * bibliothèque quand elle existe » sans dupliquer la logique de résolution.
 */

export interface DimensionedFurnitureEntry {
  /** Clé de regroupement stable — pas un identifiant d'instance. */
  key: string;
  label: string;
  footprint: { w: number; d: number; h: number };
  quantity: number;
  catalogRef?: string;
  linkedToLibrary: boolean;
}

function groupKey(item: FurnitureItem): string {
  const ref = item.catalogRef ?? item.label;
  return `${ref}::${item.footprint.w}x${item.footprint.d}x${item.footprint.h}`;
}

export function buildFurnitureList(
  furniture: readonly FurnitureItem[],
  librarySlugs: ReadonlySet<string> = new Set(),
): DimensionedFurnitureEntry[] {
  const groups = new Map<string, DimensionedFurnitureEntry>();

  for (const item of furniture) {
    const key = groupKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    groups.set(key, {
      key,
      label: item.label,
      footprint: item.footprint,
      quantity: 1,
      ...(item.catalogRef ? { catalogRef: item.catalogRef } : {}),
      linkedToLibrary: item.catalogRef ? librarySlugs.has(item.catalogRef) : false,
    });
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}
