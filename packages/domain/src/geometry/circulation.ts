import type { FurnitureItem, Opening, Point, Wall } from "./scene-schema";
import { furnitureCorners } from "./collisions";
import { pointAtOffset } from "./openings";
import { polygonCentroid, roomPolygon, wallLengthCm, wallVector } from "./room";

/**
 * Analyse de circulation en temps réel (docs/05 M4 : « passages, dégagements,
 * collisions »). Les collisions et dégagements vivent dans `collisions.ts` ;
 * ce fichier calcule la **largeur des passages** entre les portes d'une
 * pièce, à partir d'une grille d'occupation.
 *
 * Principe : pour chaque cellule libre de la grille, on calcule sa distance
 * au plus proche obstacle (mur ou meuble) — c'est le rayon du plus grand
 * cercle libre centré sur cette cellule. Le chemin le plus large entre deux
 * portes est celui qui maximise le minimum de cette distance le long du
 * trajet (problème du « chemin le plus large », résolu par une variante de
 * Dijkstra). La largeur de passage annoncée est le double de ce minimum —
 * c'est une estimation, pas une mesure exacte au pixel près, mais elle est
 * stable, pure, et calculable sans navigateur.
 */

export const CIRCULATION_MIN_CM = 90;
export const CIRCULATION_CRITICAL_CM = 60;
const DEFAULT_CELL_CM = 5;
const DOOR_INSET_CM = 50;

interface Grid {
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  cellCm: number;
  occupied: Uint8Array;
}

function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function buildOccupancyGrid(
  polygon: readonly Point[],
  furniture: readonly FurnitureItem[],
  cellCm: number,
): Grid {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const originX = Math.min(...xs);
  const originY = Math.min(...ys);
  const width = Math.max(...xs) - originX;
  const height = Math.max(...ys) - originY;
  const cols = Math.max(1, Math.ceil(width / cellCm));
  const rows = Math.max(1, Math.ceil(height / cellCm));
  const occupied = new Uint8Array(cols * rows);
  const furnitureCornersList = furniture.map((item) => furnitureCorners(item));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const center: Point = {
        x: originX + (col + 0.5) * cellCm,
        y: originY + (row + 0.5) * cellCm,
      };
      let occ = !pointInPolygon(center, polygon);
      if (!occ) {
        for (const corners of furnitureCornersList) {
          if (pointInPolygon(center, corners)) {
            occ = true;
            break;
          }
        }
      }
      occupied[row * cols + col] = occ ? 1 : 0;
    }
  }
  return { cols, rows, originX, originY, cellCm, occupied };
}

class MinHeap<T> {
  private items: { priority: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: T): void {
    this.items.push({ priority, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.priority <= this.items[i]!.priority) break;
      [this.items[parent], this.items[i]] = [this.items[i]!, this.items[parent]!];
      i = parent;
    }
  }

  pop(): { priority: number; value: T } | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (!top) return undefined;
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (
          left < this.items.length &&
          this.items[left]!.priority < this.items[smallest]!.priority
        )
          smallest = left;
        if (
          right < this.items.length &&
          this.items[right]!.priority < this.items[smallest]!.priority
        )
          smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i]!, this.items[smallest]!];
        i = smallest;
      }
    }
    return top;
  }
}

const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/** Distance (cm) de chaque cellule libre au plus proche obstacle, par Dijkstra multi-source. */
function distanceTransformCm(grid: Grid): Float64Array {
  const distances = new Float64Array(grid.cols * grid.rows).fill(Infinity);
  const heap = new MinHeap<number>();
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const idx = row * grid.cols + col;
      if (grid.occupied[idx] === 1) {
        distances[idx] = 0;
        heap.push(0, idx);
      }
    }
  }
  while (heap.size > 0) {
    const popped = heap.pop()!;
    const { priority: dist, value: idx } = popped;
    if (dist > distances[idx]!) continue;
    const col = idx % grid.cols;
    const row = Math.floor(idx / grid.cols);
    for (const [dc, dr, cost] of NEIGHBORS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
      const nIdx = nr * grid.cols + nc;
      const candidate = dist + cost * grid.cellCm;
      if (candidate < distances[nIdx]!) {
        distances[nIdx] = candidate;
        heap.push(candidate, nIdx);
      }
    }
  }
  return distances;
}

function toCell(grid: Grid, point: Point): { col: number; row: number } {
  const col = Math.min(
    grid.cols - 1,
    Math.max(0, Math.floor((point.x - grid.originX) / grid.cellCm)),
  );
  const row = Math.min(
    grid.rows - 1,
    Math.max(0, Math.floor((point.y - grid.originY) / grid.cellCm)),
  );
  return { col, row };
}

/** Cellule libre la plus proche du point demandé (recherche en spirale bornée). */
function nearestFreeCell(grid: Grid, point: Point): number | null {
  const { col, row } = toCell(grid, point);
  for (let radius = 0; radius < Math.max(grid.cols, grid.rows); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
        const idx = nr * grid.cols + nc;
        if (grid.occupied[idx] === 0) return idx;
      }
    }
  }
  return null;
}

/** Chemin le plus large entre deux cellules : maximise le minimum de clairance traversée. */
function widestPathCm(
  grid: Grid,
  distances: Float64Array,
  startIdx: number,
  endIdx: number,
): number {
  const bottleneck = new Float64Array(grid.cols * grid.rows).fill(-1);
  bottleneck[startIdx] = distances[startIdx]!;
  const heap = new MinHeap<number>(); // priorité = -bottleneck (on veut le max en premier)
  heap.push(-bottleneck[startIdx], startIdx);
  const visited = new Uint8Array(grid.cols * grid.rows);

  while (heap.size > 0) {
    const { value: idx } = heap.pop()!;
    if (visited[idx] === 1) continue;
    visited[idx] = 1;
    if (idx === endIdx) return bottleneck[idx]!;
    const col = idx % grid.cols;
    const row = Math.floor(idx / grid.cols);
    for (const [dc, dr] of NEIGHBORS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
      const nIdx = nr * grid.cols + nc;
      if (grid.occupied[nIdx] === 1) continue;
      const candidate = Math.min(bottleneck[idx]!, distances[nIdx]!);
      if (candidate > bottleneck[nIdx]!) {
        bottleneck[nIdx] = candidate;
        heap.push(-candidate, nIdx);
      }
    }
  }
  return bottleneck[endIdx]! >= 0 ? bottleneck[endIdx]! : 0;
}

/** Point juste à l'intérieur de la pièce, en face d'une porte (recul de `DOOR_INSET_CM`). */
function doorInteriorPoint(wall: Wall, opening: Opening, roomCentroid: Point): Point {
  const mid = pointAtOffset(wall, opening.offsetCm + opening.widthCm / 2);
  const { x, y } = wallVector(wall);
  const length = wallLengthCm(wall) || 1;
  const normalA: Point = { x: -y / length, y: x / length };
  const normalB: Point = { x: -normalA.x, y: -normalA.y };
  const towardCentroidA =
    (roomCentroid.x - mid.x) * normalA.x + (roomCentroid.y - mid.y) * normalA.y;
  const inward = towardCentroidA >= 0 ? normalA : normalB;
  return { x: mid.x + inward.x * DOOR_INSET_CM, y: mid.y + inward.y * DOOR_INSET_CM };
}

export type PassageSeverity = "ok" | "warning" | "critical";

export interface CirculationPassage {
  fromOpeningId: string;
  toOpeningId: string | null; // null = jusqu'au centre de la pièce (porte unique)
  widthCm: number;
  severity: PassageSeverity;
}

function severityFor(widthCm: number): PassageSeverity {
  if (widthCm < CIRCULATION_CRITICAL_CM) return "critical";
  if (widthCm < CIRCULATION_MIN_CM) return "warning";
  return "ok";
}

/**
 * Largeur des passages entre les portes d'une pièce (ou entre l'unique porte
 * et le centre de la pièce). `null` si la pièce n'est pas encore une boucle
 * fermée de murs — état normal en cours de tracé, pas une erreur.
 */
export function analyzeCirculation(
  walls: readonly Wall[],
  openings: readonly Opening[],
  furniture: readonly FurnitureItem[],
  cellCm = DEFAULT_CELL_CM,
): CirculationPassage[] | null {
  const polygon = roomPolygon(walls);
  if (!polygon) return null;

  const doors = openings.filter((o) => o.kind === "door");
  if (doors.length === 0) return [];

  const grid = buildOccupancyGrid(polygon, furniture, cellCm);
  const distances = distanceTransformCm(grid);
  const centroid = polygonCentroid(polygon);

  const wallById = new Map(walls.map((w) => [w.id, w]));
  const doorPoints = doors
    .map((opening) => {
      const wall = wallById.get(opening.wallId);
      if (!wall) return null;
      return { opening, point: doorInteriorPoint(wall, opening, centroid) };
    })
    .filter((d): d is { opening: Opening; point: Point } => d !== null);

  const passages: CirculationPassage[] = [];

  function widthBetween(pointA: Point, pointB: Point): number | null {
    const startIdx = nearestFreeCell(grid, pointA);
    const endIdx = nearestFreeCell(grid, pointB);
    if (startIdx === null || endIdx === null) return null;
    return widestPathCm(grid, distances, startIdx, endIdx) * 2;
  }

  if (doorPoints.length === 1) {
    const width = widthBetween(doorPoints[0]!.point, centroid);
    if (width !== null) {
      passages.push({
        fromOpeningId: doorPoints[0]!.opening.id,
        toOpeningId: null,
        widthCm: width,
        severity: severityFor(width),
      });
    }
    return passages;
  }

  for (let i = 0; i < doorPoints.length; i++) {
    for (let j = i + 1; j < doorPoints.length; j++) {
      const width = widthBetween(doorPoints[i]!.point, doorPoints[j]!.point);
      if (width === null) continue;
      passages.push({
        fromOpeningId: doorPoints[i]!.opening.id,
        toOpeningId: doorPoints[j]!.opening.id,
        widthCm: width,
        severity: severityFor(width),
      });
    }
  }
  return passages;
}
