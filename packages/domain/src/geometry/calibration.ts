import { z } from "zod";

/**
 * Calibrage d'échelle d'un plan importé (docs/05 M10, PROJ-02).
 *
 * L'apprenant pointe deux repères sur l'image (ex. les deux extrémités d'un
 * mur dont il connaît la longueur réelle) et saisit cette longueur en cm —
 * `computeCalibration` en déduit un ratio cm/pixel, seule information
 * nécessaire pour convertir n'importe quelle distance mesurée sur l'image en
 * une distance réelle. Fonction pure, testable sans image ni canevas.
 */

export const CalibrationPointSchema = z.object({ x: z.number(), y: z.number() });
export type CalibrationPoint = z.infer<typeof CalibrationPointSchema>;

export const CalibrationSchema = z.object({
  refPointA: CalibrationPointSchema,
  refPointB: CalibrationPointSchema,
  refLengthCm: z.number().positive(),
  cmPerPixel: z.number().positive(),
});
export type Calibration = z.infer<typeof CalibrationSchema>;

function pixelDistance(a: CalibrationPoint, b: CalibrationPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Lève une erreur explicite plutôt que de produire un ratio infini ou nul — deux points confondus ne calibrent rien. */
export function computeCalibration(
  refPointA: CalibrationPoint,
  refPointB: CalibrationPoint,
  refLengthCm: number,
): Calibration {
  const pixelLength = pixelDistance(refPointA, refPointB);
  if (pixelLength <= 0) {
    throw new Error(
      "Les deux points de référence doivent être distincts pour calibrer un plan.",
    );
  }
  return { refPointA, refPointB, refLengthCm, cmPerPixel: refLengthCm / pixelLength };
}

/** Longueur réelle (cm) d'une distance mesurée en pixels sur le plan calibré. */
export function pixelsToCm(calibration: Calibration, distancePx: number): number {
  return distancePx * calibration.cmPerPixel;
}

/** Convertit un point en pixels (repère de l'image) en un point en cm (repère de la scène). */
export function pixelPointToCm(
  calibration: Calibration,
  point: CalibrationPoint,
): CalibrationPoint {
  return { x: point.x * calibration.cmPerPixel, y: point.y * calibration.cmPerPixel };
}
