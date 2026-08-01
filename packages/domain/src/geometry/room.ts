import type { Point, Wall } from "./scene-schema";

/**
 * Géométrie de base d'une pièce : longueur/angle de mur, polygone formé par
 * la chaîne de murs, surface et périmètre. Calculs sur l'axe central des
 * murs (pas sur leur épaisseur) — c'est l'approximation retenue pour
 * l'enseignement du zonage (docs/04 §4 : « ce qui est calculé, jamais
 * stocké »), pas une mesure de surface habitable au sens du diagnostic
 * immobilier.
 */

const EPSILON_CM = 0.01;

export function wallVector(wall: Wall): Point {
  return { x: wall.b.x - wall.a.x, y: wall.b.y - wall.a.y };
}

export function wallLengthCm(wall: Wall): number {
  const { x, y } = wallVector(wall);
  return Math.hypot(x, y);
}

/** Angle du mur en radians, dans le repère de la pièce (0 = vers l'est). */
export function wallAngleRad(wall: Wall): number {
  const { x, y } = wallVector(wall);
  return Math.atan2(y, x);
}

/**
 * Chaîne les murs en polygone si `b` de chacun coïncide avec `a` du suivant
 * (boucle fermée). Retourne `null` si la pièce n'est pas encore close — c'est
 * le cas normal pendant le tracé, pas une erreur à signaler.
 */
export function roomPolygon(walls: readonly Wall[]): Point[] | null {
  if (walls.length < 3) return null;
  const points: Point[] = [walls[0]!.a];
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i]!;
    const previousEnd = points[points.length - 1]!;
    if (Math.hypot(wall.a.x - previousEnd.x, wall.a.y - previousEnd.y) > EPSILON_CM) {
      return null;
    }
    points.push(wall.b);
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (Math.hypot(last.x - first.x, last.y - first.y) > EPSILON_CM) return null;
  points.pop(); // le dernier point == le premier, la boucle se referme implicitement
  return points;
}

/** Aire d'un polygone fermé (formule du lacet), en cm². Toujours positive. */
export function polygonAreaCm2(points: readonly Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonPerimeterCm(points: readonly Point[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    total += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return total;
}

export function polygonCentroid(points: readonly Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Point dans un repère quelconque, ramené à la maille de la grille de magnétisme. */
export function snapToGrid(value: number, gridCm: number): number {
  if (gridCm <= 0) return value;
  return Math.round(value / gridCm) * gridCm;
}

export function snapPointToGrid(point: Point, gridCm: number): Point {
  return { x: snapToGrid(point.x, gridCm), y: snapToGrid(point.y, gridCm) };
}

/** Surface d'une pièce dessinée, ou `null` si la boucle de murs n'est pas fermée. */
export function roomAreaM2(walls: readonly Wall[]): number | null {
  const polygon = roomPolygon(walls);
  if (!polygon) return null;
  return polygonAreaCm2(polygon) / 10_000;
}

export function roomPerimeterM(walls: readonly Wall[]): number | null {
  const polygon = roomPolygon(walls);
  if (!polygon) return null;
  return polygonPerimeterCm(polygon) / 100;
}
