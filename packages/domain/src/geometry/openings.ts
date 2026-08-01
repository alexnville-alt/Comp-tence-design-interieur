import type { Opening, Point, Wall } from "./scene-schema";
import { wallLengthCm, wallVector } from "./room";

/**
 * Placement des ouvertures (portes/fenêtres) sur un mur. Une porte ne peut
 * pas être placée hors d'un mur, ni chevaucher une autre ouverture du même
 * mur — c'est l'invariant testé sans navigateur exigé par le critère
 * d'acceptation M4 (docs/05).
 */

const EPSILON_CM = 0.01;

export type OpeningIssueCode = "OUT_OF_BOUNDS" | "OVERLAPS";

export interface OpeningIssue {
  openingId: string;
  code: OpeningIssueCode;
  message: string;
}

/** Point sur l'axe du mur, à `offsetCm` depuis son extrémité `a`. */
export function pointAtOffset(wall: Wall, offsetCm: number): Point {
  const length = wallLengthCm(wall);
  const { x, y } = wallVector(wall);
  const t = length === 0 ? 0 : offsetCm / length;
  return { x: wall.a.x + x * t, y: wall.a.y + y * t };
}

function openingRange(opening: Opening): [number, number] {
  return [opening.offsetCm, opening.offsetCm + opening.widthCm];
}

export function isOpeningWithinWall(wall: Wall, opening: Opening): boolean {
  const [start, end] = openingRange(opening);
  const length = wallLengthCm(wall);
  return start >= -EPSILON_CM && end <= length + EPSILON_CM;
}

export function openingsOverlap(a: Opening, b: Opening): boolean {
  const [startA, endA] = openingRange(a);
  const [startB, endB] = openingRange(b);
  return startA < endB - EPSILON_CM && startB < endA - EPSILON_CM;
}

/** Contrôle toutes les ouvertures d'un même mur : hors-limites et chevauchements. */
export function validateWallOpenings(
  wall: Wall,
  openings: readonly Opening[],
): OpeningIssue[] {
  const issues: OpeningIssue[] = [];
  for (const opening of openings) {
    if (!isOpeningWithinWall(wall, opening)) {
      issues.push({
        openingId: opening.id,
        code: "OUT_OF_BOUNDS",
        message: `${opening.kind === "door" ? "La porte" : "L'ouverture"} dépasse du mur.`,
      });
    }
  }
  for (let i = 0; i < openings.length; i++) {
    for (let j = i + 1; j < openings.length; j++) {
      if (openingsOverlap(openings[i]!, openings[j]!)) {
        issues.push({
          openingId: openings[i]!.id,
          code: "OVERLAPS",
          message: "Deux ouvertures se chevauchent sur le même mur.",
        });
      }
    }
  }
  return issues;
}

/** Contrôle l'ensemble des ouvertures d'une scène, regroupées par mur. */
export function validateSceneOpenings(
  walls: readonly Wall[],
  openings: readonly Opening[],
): OpeningIssue[] {
  const issues: OpeningIssue[] = [];
  for (const wall of walls) {
    const onThisWall = openings.filter((o) => o.wallId === wall.id);
    issues.push(...validateWallOpenings(wall, onThisWall));
  }
  return issues;
}
