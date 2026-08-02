"use client";

import * as React from "react";
import { heartbeatAction } from "./heartbeat-actions";
import { HEARTBEAT_INTERVAL_MS } from "./heartbeat";

/**
 * Mesure du temps réellement passé (docs/05 M9, PROG-05) — ne rend rien,
 * n'exécute que l'effet. Un battement n'est envoyé que pendant que la page
 * est visible et au premier plan (`document.visibilityState`) : un onglet
 * caché n'accumule jamais de temps, l'intervalle est simplement suspendu et
 * reprend là où il en était à la prochaine visibilité — ni rattrapage ni
 * accumulation pendant l'absence.
 */
export function HeartbeatTracker({ context }: { context?: string }) {
  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function sendHeartbeat() {
      void heartbeatAction(context);
    }

    function startInterval() {
      if (intervalId !== null) return;
      intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function stopInterval() {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") startInterval();
      else stopInterval();
    }

    if (document.visibilityState === "visible") startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [context]);

  return null;
}
