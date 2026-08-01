import type { FurnitureItem, Point } from "./scene-schema";

/**
 * Détection de collisions entre meubles. Une empreinte de mobilier est un
 * rectangle pivoté (docs/04 : « empreintes au sol, boîtes englobantes ») ; on
 * teste l'intersection par axes séparateurs (SAT), qui est exact pour deux
 * polygones convexes — pas une approximation par boîtes englobantes non
 * pivotées, qui donnerait de faux positifs dès qu'un meuble tourne.
 */

/** Coins du rectangle au sol d'un meuble, dans le repère de la pièce. */
export function furnitureCorners(item: FurnitureItem): [Point, Point, Point, Point] {
  const halfW = item.footprint.w / 2;
  const halfD = item.footprint.d / 2;
  const local: Point[] = [
    { x: -halfW, y: -halfD },
    { x: halfW, y: -halfD },
    { x: halfW, y: halfD },
    { x: -halfW, y: halfD },
  ];
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = local.map((p): Point => ({
    x: item.position.x + p.x * cos - p.y * sin,
    y: item.position.y + p.x * sin + p.y * cos,
  }));
  return corners as [Point, Point, Point, Point];
}

function edgeAxes(polygon: readonly Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!;
    const q = polygon[(i + 1) % polygon.length]!;
    const edge = { x: q.x - p.x, y: q.y - p.y };
    const length = Math.hypot(edge.x, edge.y) || 1;
    axes.push({ x: -edge.y / length, y: edge.x / length });
  }
  return axes;
}

function project(polygon: readonly Point[], axis: Point): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of polygon) {
    const dot = p.x * axis.x + p.y * axis.y;
    min = Math.min(min, dot);
    max = Math.max(max, dot);
  }
  return [min, max];
}

const EPSILON_CM = 1e-6;

/** Vrai si deux polygones convexes se chevauchent (test par axes séparateurs). */
export function polygonsIntersect(a: readonly Point[], b: readonly Point[]): boolean {
  const axes = [...edgeAxes(a), ...edgeAxes(b)];
  for (const axis of axes) {
    const [minA, maxA] = project(a, axis);
    const [minB, maxB] = project(b, axis);
    if (maxA <= minB + EPSILON_CM || maxB <= minA + EPSILON_CM) {
      return false; // axe séparateur trouvé → pas de collision
    }
  }
  return true;
}

export interface FurnitureCollision {
  aId: string;
  bId: string;
}

/** Toutes les paires de meubles qui se chevauchent. O(n²), confortable jusqu'à ~150 objets. */
export function detectFurnitureCollisions(
  furniture: readonly FurnitureItem[],
): FurnitureCollision[] {
  const collisions: FurnitureCollision[] = [];
  const corners = furniture.map((item) => furnitureCorners(item));
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      if (polygonsIntersect(corners[i]!, corners[j]!)) {
        collisions.push({ aId: furniture[i]!.id, bId: furniture[j]!.id });
      }
    }
  }
  return collisions;
}

/**
 * Rectangle de dégagement devant un meuble (ouverture de porte de placard,
 * recul devant un canapé…), dans le sens local +d après rotation.
 */
export function frontClearanceRect(item: FurnitureItem): Point[] | null {
  if (!item.clearance || item.clearance.front <= 0) return null;
  const halfW = item.footprint.w / 2;
  const startD = item.footprint.d / 2;
  const endD = startD + item.clearance.front;
  const local: Point[] = [
    { x: -halfW, y: startD },
    { x: halfW, y: startD },
    { x: halfW, y: endD },
    { x: -halfW, y: endD },
  ];
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return local.map((p) => ({
    x: item.position.x + p.x * cos - p.y * sin,
    y: item.position.y + p.x * sin + p.y * cos,
  }));
}

export interface ClearanceViolation {
  itemId: string;
  blockedById: string;
}

/** Dégagements déclarés sur un meuble mais obstrués par un autre. */
export function detectClearanceViolations(
  furniture: readonly FurnitureItem[],
): ClearanceViolation[] {
  const violations: ClearanceViolation[] = [];
  const corners = furniture.map((item) => furnitureCorners(item));
  for (let i = 0; i < furniture.length; i++) {
    const rect = frontClearanceRect(furniture[i]!);
    if (!rect) continue;
    for (let j = 0; j < furniture.length; j++) {
      if (i === j) continue;
      if (polygonsIntersect(rect, corners[j]!)) {
        violations.push({ itemId: furniture[i]!.id, blockedById: furniture[j]!.id });
      }
    }
  }
  return violations;
}
