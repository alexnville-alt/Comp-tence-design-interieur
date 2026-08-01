/**
 * Catalogue de mobilier minimal pour l'atelier (M4). En attendant la
 * bibliothèque (M7, `LibraryItem`), ces empreintes suffisent à poser du
 * mobilier réaliste et à raisonner sur la circulation. `slug` deviendra
 * `LibraryItem.slug` quand M7 sera livré — `FurnitureItem.catalogRef` pointe
 * déjà vers ce même identifiant pour éviter une migration de données.
 */

export type FurnitureCategory = "assise" | "table" | "couchage" | "rangement" | "autre";

export interface FurnitureCatalogEntry {
  slug: string;
  label: string;
  category: FurnitureCategory;
  footprint: { w: number; d: number; h: number };
  clearance?: { front: number; sides: number };
}

export const FURNITURE_CATALOG: readonly FurnitureCatalogEntry[] = [
  {
    slug: "canape-2-places",
    label: "Canapé 2 places",
    category: "assise",
    footprint: { w: 160, d: 90, h: 85 },
    clearance: { front: 60, sides: 0 },
  },
  {
    slug: "canape-3-places",
    label: "Canapé 3 places",
    category: "assise",
    footprint: { w: 220, d: 95, h: 85 },
    clearance: { front: 60, sides: 0 },
  },
  {
    slug: "fauteuil",
    label: "Fauteuil",
    category: "assise",
    footprint: { w: 80, d: 85, h: 90 },
    clearance: { front: 50, sides: 0 },
  },
  {
    slug: "table-basse",
    label: "Table basse",
    category: "table",
    footprint: { w: 110, d: 60, h: 40 },
  },
  {
    slug: "table-a-manger-4",
    label: "Table à manger (4 couverts)",
    category: "table",
    footprint: { w: 120, d: 80, h: 75 },
    clearance: { front: 60, sides: 60 },
  },
  {
    slug: "table-a-manger-6",
    label: "Table à manger (6 couverts)",
    category: "table",
    footprint: { w: 160, d: 90, h: 75 },
    clearance: { front: 60, sides: 60 },
  },
  {
    slug: "chaise",
    label: "Chaise",
    category: "assise",
    footprint: { w: 45, d: 50, h: 90 },
    clearance: { front: 40, sides: 0 },
  },
  {
    slug: "lit-simple",
    label: "Lit simple (90×190)",
    category: "couchage",
    footprint: { w: 90, d: 190, h: 45 },
    clearance: { front: 70, sides: 0 },
  },
  {
    slug: "lit-double",
    label: "Lit double (160×200)",
    category: "couchage",
    footprint: { w: 160, d: 200, h: 45 },
    clearance: { front: 70, sides: 0 },
  },
  {
    slug: "armoire",
    label: "Armoire 2 portes",
    category: "rangement",
    footprint: { w: 100, d: 60, h: 200 },
    clearance: { front: 90, sides: 0 },
  },
  {
    slug: "commode",
    label: "Commode",
    category: "rangement",
    footprint: { w: 90, d: 45, h: 80 },
  },
  {
    slug: "bureau",
    label: "Bureau",
    category: "table",
    footprint: { w: 120, d: 60, h: 75 },
    clearance: { front: 70, sides: 0 },
  },
  {
    slug: "meuble-tv",
    label: "Meuble TV",
    category: "rangement",
    footprint: { w: 140, d: 40, h: 45 },
  },
  {
    slug: "tapis",
    label: "Tapis 200×300",
    category: "autre",
    footprint: { w: 200, d: 300, h: 1 },
  },
  {
    slug: "etagere",
    label: "Étagère",
    category: "rangement",
    footprint: { w: 80, d: 30, h: 180 },
  },
] as const;

export function findCatalogEntry(slug: string): FurnitureCatalogEntry | undefined {
  return FURNITURE_CATALOG.find((entry) => entry.slug === slug);
}
