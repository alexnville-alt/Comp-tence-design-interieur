"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Scene } from "@atelier/domain";
import { AccessibleSceneList } from "./accessible-scene-list";
import { CirculationAlerts } from "./circulation-alerts";
import { PropertyInspector } from "./property-inspector";
import type { RoomVersionSummary } from "./data";
import type { ReferencePlan } from "./room-canvas";
import {
  KEYBOARD_STEP_CM,
  KEYBOARD_STEP_LARGE_CM,
  ROTATE_STEP_DEG,
  useStudioStore,
} from "./store";
import { Toolbar } from "./toolbar";
import { VersionBar } from "./version-bar";
import { saveRoomVersionAction } from "./actions";

const RoomCanvas = dynamic(() => import("./room-canvas").then((m) => m.RoomCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center text-sm text-[var(--text-muted)]">
      Chargement du canevas…
    </div>
  ),
});

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Éditeur de pièce (docs/03 §4.4). Orchestre le canevas, la palette
 * d'outils, l'inspecteur, les alertes et l'arbre DOM accessible autour d'un
 * seul état partagé (`useStudioStore`).
 */
export function StudioEditor({
  roomId,
  initialScene,
  initialVersions,
  initialCurrentVersionId,
  referencePlan = null,
}: {
  roomId: string;
  initialScene: Scene;
  initialVersions: RoomVersionSummary[];
  initialCurrentVersionId: string | null;
  referencePlan?: ReferencePlan | null;
}) {
  const [showReferencePlan, setShowReferencePlan] = React.useState(true);
  const loadScene = useStudioStore((s) => s.loadScene);
  const scene = useStudioStore((s) => s.scene);
  const setTool = useStudioStore((s) => s.setTool);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const moveSelected = useStudioStore((s) => s.moveSelected);
  const rotateSelected = useStudioStore((s) => s.rotateSelected);
  const removeSelected = useStudioStore((s) => s.removeSelected);
  const selectedId = useStudioStore((s) => s.selectedId);
  const select = useStudioStore((s) => s.select);
  const markSaved = useStudioStore((s) => s.markSaved);

  // useLayoutEffect plutôt que useEffect : la scène du serveur remplace la
  // scène vide par défaut du store avant la première peinture, sans clignotement.
  React.useLayoutEffect(() => {
    loadScene(initialScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  React.useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRoomVersionAction(roomId, scene, "Enregistrement rapide").then(
          markSaved,
        );
        return;
      }

      if (e.key === "Escape") {
        select(null, null);
        setTool("select");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          removeSelected();
        }
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (!selectedId) return;
        e.preventDefault();
        const step = e.shiftKey ? KEYBOARD_STEP_LARGE_CM : KEYBOARD_STEP_CM;
        const deltas: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const [dx, dy] = deltas[e.key]!;
        moveSelected(dx, dy);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "r") {
        e.preventDefault();
        if (selectedId) rotateSelected(e.shiftKey ? -ROTATE_STEP_DEG : ROTATE_STEP_DEG);
        else setTool("room");
        return;
      }
      if (key === "v") setTool("select");
      else if (key === "d") setTool("door");
      else if (key === "f") setTool("window");
      else if (key === "m") setTool("furniture");
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    moveSelected,
    rotateSelected,
    removeSelected,
    selectedId,
    undo,
    redo,
    select,
    setTool,
    roomId,
    scene,
    markSaved,
  ]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-56" aria-label="Outils">
        <Toolbar />
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {referencePlan ? (
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={showReferencePlan}
              onChange={(e) => setShowReferencePlan(e.target.checked)}
            />
            Afficher le plan de référence
          </label>
        ) : null}
        <div className="overflow-auto rounded-[var(--radius-atelier)] border border-[var(--border)]">
          <RoomCanvas referencePlan={showReferencePlan ? referencePlan : null} />
        </div>
        <VersionBar
          roomId={roomId}
          initialVersions={initialVersions}
          initialCurrentVersionId={initialCurrentVersionId}
        />
      </div>

      <aside
        className="w-full shrink-0 space-y-6 lg:w-72"
        aria-label="Propriétés et alertes"
      >
        <section>
          <h2 className="mb-2 text-sm font-medium">Propriétés</h2>
          <PropertyInspector />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium">Alertes</h2>
          <CirculationAlerts />
        </section>
        <section>
          <AccessibleSceneList />
        </section>
      </aside>
    </div>
  );
}
