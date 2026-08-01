"use client";

import * as React from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { analyzeSceneAlerts, type AlertSeverity } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { useStudioStore } from "./store";

/**
 * Alertes de circulation, collisions et dégagements — affichées **en
 * continu**, pas seulement à la demande (docs/03 §4.4) : c'est en les voyant
 * se déclencher sur son propre plan que la règle s'apprend.
 *
 * La gravité est toujours doublée d'une icône et d'un mot, jamais de la
 * seule couleur (docs/03 §6, point 2).
 */

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "Alerte",
  warning: "Avertissement",
  info: "Info",
};

const SEVERITY_ICON: Record<AlertSeverity, typeof Info> = {
  critical: OctagonAlert,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  critical: "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]",
  warning: "border-[var(--warning)] bg-[var(--warning-subtle)] text-[var(--warning)]",
  info: "border-[var(--info)] bg-[var(--info-subtle)] text-[var(--info)]",
};

export function CirculationAlerts() {
  const scene = useStudioStore((s) => s.scene);
  const alerts = React.useMemo(() => analyzeSceneAlerts(scene), [scene]);

  return (
    <div aria-live="polite" className="space-y-2">
      {alerts.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucune alerte de circulation pour l'instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            return (
              <li
                key={alert.id}
                className={cn(
                  "flex items-start gap-2 rounded-[var(--radius-atelier)] border p-2 text-sm",
                  SEVERITY_CLASS[alert.severity],
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>{SEVERITY_LABEL[alert.severity]} :</strong> {alert.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
