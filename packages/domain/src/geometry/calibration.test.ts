import { describe, expect, it } from "vitest";
import {
  CalibrationSchema,
  computeCalibration,
  pixelPointToCm,
  pixelsToCm,
} from "./calibration";

describe("computeCalibration", () => {
  it("calcule un ratio cm/pixel cohérent avec la référence", () => {
    // Un mur de 200 cm mesuré à 100 px sur l'image → 2 cm/px.
    const calibration = computeCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 200);
    expect(calibration.cmPerPixel).toBeCloseTo(2, 10);
  });

  it("fonctionne pour une référence en diagonale (distance euclidienne)", () => {
    // Segment de 3-4-5 : 3² + 4² = 5² → 50 px de long pour 100 cm réels.
    const calibration = computeCalibration({ x: 0, y: 0 }, { x: 30, y: 40 }, 100);
    expect(calibration.cmPerPixel).toBeCloseTo(2, 10);
  });

  it("lève une erreur si les deux points de référence sont confondus", () => {
    expect(() => computeCalibration({ x: 10, y: 10 }, { x: 10, y: 10 }, 200)).toThrow();
  });

  it("valide CalibrationSchema sur son propre résultat", () => {
    const calibration = computeCalibration({ x: 5, y: 5 }, { x: 205, y: 5 }, 400);
    expect(CalibrationSchema.safeParse(calibration).success).toBe(true);
  });
});

describe("pixelsToCm / pixelPointToCm", () => {
  it("convertit une distance mesurée à ±2 % d'un plan de référence (PROJ-02, critère d'acceptation)", () => {
    // Plan de référence synthétique : une cuisine de 320 × 240 cm dessinée à
    // l'échelle 1 px = 1 cm sur l'image source (donc cmPerPixel = 1), avec un
    // plan de travail de 180 cm à vérifier.
    const calibration = computeCalibration({ x: 0, y: 0 }, { x: 320, y: 0 }, 320);
    const measuredCm = pixelsToCm(calibration, 180);
    const expectedCm = 180;
    const errorRatio = Math.abs(measuredCm - expectedCm) / expectedCm;
    expect(errorRatio).toBeLessThanOrEqual(0.02);
  });

  it("convertit un point pixel en point cm en appliquant le même ratio aux deux axes", () => {
    const calibration = computeCalibration({ x: 0, y: 0 }, { x: 50, y: 0 }, 100); // 2 cm/px
    expect(pixelPointToCm(calibration, { x: 30, y: 20 })).toEqual({ x: 60, y: 40 });
  });

  it("est cohérent avec computeCalibration : reconvertir la référence redonne la longueur d'origine", () => {
    const calibration = computeCalibration({ x: 12, y: 8 }, { x: 212, y: 8 }, 350);
    expect(pixelsToCm(calibration, 200)).toBeCloseTo(350, 10);
  });
});
