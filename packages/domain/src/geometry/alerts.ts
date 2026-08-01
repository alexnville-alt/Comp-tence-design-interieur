import type { Scene } from "./scene-schema";
import { detectClearanceViolations, detectFurnitureCollisions } from "./collisions";
import { analyzeCirculation } from "./circulation";
import { validateSceneOpenings } from "./openings";

/**
 * Agrège en une seule liste les alertes affichées en continu dans l'atelier
 * (docs/03 §4.4) : circulation, collisions et dégagements. C'est la fonction
 * que le canevas (client) et une future critique IA (serveur) appellent
 * toutes les deux, garantissant qu'elles voient exactement les mêmes règles.
 */

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertKind = "circulation" | "collision" | "clearance" | "opening";

export interface AtelierAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
}

export function analyzeSceneAlerts(scene: Scene): AtelierAlert[] {
  const alerts: AtelierAlert[] = [];

  const openingIssues = validateSceneOpenings(scene.walls, scene.openings);
  for (const issue of openingIssues) {
    alerts.push({
      id: `opening:${issue.openingId}:${issue.code}`,
      kind: "opening",
      severity: "critical",
      message: issue.message,
    });
  }

  const collisions = detectFurnitureCollisions(scene.furniture);
  for (const collision of collisions) {
    alerts.push({
      id: `collision:${collision.aId}:${collision.bId}`,
      kind: "collision",
      severity: "critical",
      message: "Deux meubles se chevauchent.",
    });
  }

  const clearanceViolations = detectClearanceViolations(scene.furniture);
  for (const violation of clearanceViolations) {
    alerts.push({
      id: `clearance:${violation.itemId}:${violation.blockedById}`,
      kind: "clearance",
      severity: "warning",
      message: "Le dégagement nécessaire devant ce meuble est obstrué.",
    });
  }

  const passages = analyzeCirculation(scene.walls, scene.openings, scene.furniture);
  if (passages) {
    for (const passage of passages) {
      if (passage.severity === "ok") continue;
      const widthCm = Math.round(passage.widthCm);
      alerts.push({
        id: `circulation:${passage.fromOpeningId}:${passage.toOpeningId ?? "centre"}`,
        kind: "circulation",
        severity: passage.severity === "critical" ? "critical" : "warning",
        message: `Passage réduit à ${widthCm} cm (recommandé ≥ 90 cm).`,
      });
    }
  }

  return alerts;
}
