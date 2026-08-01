import {
  findCatalogEntry,
  polygonCentroid,
  roomPolygon,
  wallLengthCm,
  type FurnitureItem,
  type Opening,
  type Point,
  type Scene,
  type Wall,
} from "@atelier/domain";

/**
 * Fabriques d'objets de scène. Séparées du domaine parce qu'elles génèrent
 * des identifiants (`crypto.randomUUID`, une API du navigateur) — le domaine
 * reste, lui, sans dépendance (docs/02 §1).
 */

/** Une pièce rectangulaire à partir de ses cotations, murs au sens horaire. */
export function createRectangularRoomWalls(
  widthCm: number,
  depthCm: number,
  thicknessCm = 10,
): Wall[] {
  const corners = [
    { x: 0, y: 0 },
    { x: widthCm, y: 0 },
    { x: widthCm, y: depthCm },
    { x: 0, y: depthCm },
  ];
  return corners.map((a, i) => ({
    id: crypto.randomUUID(),
    a,
    b: corners[(i + 1) % corners.length]!,
    thickness: thicknessCm,
    structural: false,
  }));
}

/**
 * Point de dépose par défaut d'un nouveau meuble : le centre de la pièce si
 * elle est fermée, sinon un point arbitraire. Un léger décalage par meuble
 * déjà posé évite l'empilement exact quand on ajoute plusieurs objets
 * d'affilée — l'utilisateur les sépare ensuite au clavier (flèches).
 */
export function defaultPlacementPoint(scene: Scene): Point {
  const polygon = roomPolygon(scene.walls);
  const base = polygon ? polygonCentroid(polygon) : { x: 100, y: 100 };
  const index = scene.furniture.length;
  return { x: base.x + (index % 5) * 15, y: base.y + Math.floor(index / 5) * 15 };
}

/**
 * Porte/fenêtre par défaut sur un mur, centrée si `offsetCm` n'est pas
 * fourni. C'est ce qui permet de poser une ouverture sans souris : au clic
 * sur un mur (`room-canvas.tsx`, `offsetCm` calculé depuis le pointeur), ou
 * depuis `PropertyInspector` sur un mur sélectionné au clavier (défaut
 * centré, ajustable ensuite par les champs numériques) — critère
 * d'acceptation M4 : « une pièce complète se construit entièrement au
 * clavier » (docs/05).
 */
export function createOpeningOnWall(
  wall: Wall,
  kind: "door" | "window",
  offsetCm?: number,
): Opening {
  const widthCm = kind === "door" ? 90 : 120;
  const length = wallLengthCm(wall);
  const maxOffset = Math.max(length - widthCm, 0);
  const clampedOffset = Math.min(Math.max(offsetCm ?? maxOffset / 2, 0), maxOffset);

  return {
    id: crypto.randomUUID(),
    wallId: wall.id,
    kind,
    offsetCm: clampedOffset,
    widthCm,
    heightCm: kind === "door" ? 204 : 120,
    sillCm: kind === "door" ? 0 : 90,
    ...(kind === "door"
      ? { doorType: "hinged" as const, swing: "in-right" as const }
      : {}),
  };
}

export function createFurnitureFromCatalog(
  slug: string,
  position: { x: number; y: number },
): FurnitureItem | null {
  const entry = findCatalogEntry(slug);
  if (!entry) return null;
  return {
    id: crypto.randomUUID(),
    catalogRef: entry.slug,
    label: entry.label,
    footprint: entry.footprint,
    position,
    rotation: 0,
    ...(entry.clearance ? { clearance: entry.clearance } : {}),
  };
}
