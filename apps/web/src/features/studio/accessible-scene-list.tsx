"use client";

import type { ReactNode } from "react";
import { wallLengthCm } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { useStudioStore } from "./store";

/**
 * Arbre DOM parallèle de la scène (docs/03 §6, point 1) : un canevas est
 * opaque pour un lecteur d'écran, donc chaque objet existe aussi ici comme
 * élément focusable et décrit en toutes lettres. `Tab` y navigue, ce qui
 * sélectionne l'objet dans le store — les mêmes flèches/`R`/`Suppr` gérés
 * par `studio-editor.tsx` s'appliquent alors, que l'objet vienne d'être
 * sélectionné à la souris sur le canevas ou au clavier ici.
 */
export function AccessibleSceneList() {
  const scene = useStudioStore((s) => s.scene);
  const selectedId = useStudioStore((s) => s.selectedId);
  const select = useStudioStore((s) => s.select);

  const hasContent =
    scene.walls.length + scene.openings.length + scene.furniture.length > 0;

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium">Objets de la pièce</h2>
      {!hasContent ? (
        <p className="text-sm text-[var(--text-muted)]">
          La pièce est vide pour l'instant.
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {scene.walls.map((wall) => (
            <li key={wall.id}>
              <SceneItemButton
                selected={selectedId === wall.id}
                onFocus={() => select(wall.id, "wall")}
                onClick={() => select(wall.id, "wall")}
              >
                Mur, {Math.round(wallLengthCm(wall))} cm
                {wall.structural ? " (porteur)" : ""}
              </SceneItemButton>
            </li>
          ))}
          {scene.openings.map((opening) => (
            <li key={opening.id}>
              <SceneItemButton
                selected={selectedId === opening.id}
                onFocus={() => select(opening.id, "opening")}
                onClick={() => select(opening.id, "opening")}
              >
                {opening.kind === "door" ? "Porte" : "Fenêtre"}, {opening.widthCm} cm, à{" "}
                {Math.round(opening.offsetCm)} cm sur son mur
              </SceneItemButton>
            </li>
          ))}
          {scene.furniture.map((item) => (
            <li key={item.id}>
              <SceneItemButton
                selected={selectedId === item.id}
                onFocus={() => select(item.id, "furniture")}
                onClick={() => select(item.id, "furniture")}
              >
                {item.label}, {item.footprint.w} × {item.footprint.d} cm, à{" "}
                {Math.round(item.position.x)} ; {Math.round(item.position.y)} cm
                {item.rotation ? `, pivoté de ${item.rotation}°` : ""}
              </SceneItemButton>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Flèches : déplacer (Maj = pas large) · R : pivoter · Suppr : retirer.
      </p>
    </div>
  );
}

function SceneItemButton({
  children,
  selected,
  onFocus,
  onClick,
}: {
  children: ReactNode;
  selected: boolean;
  onFocus: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onFocus={onFocus}
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "w-full rounded-[var(--radius-atelier)] border px-2 py-1.5 text-left text-sm",
        selected
          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-strong)]"
          : "border-transparent hover:bg-[var(--surface)]",
      )}
    >
      {children}
    </button>
  );
}
