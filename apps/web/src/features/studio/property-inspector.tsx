"use client";

import * as React from "react";
import { wallLengthCm } from "@atelier/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOpeningOnWall } from "./scene-utils";
import { useStudioStore } from "./store";

/** Panneau de propriétés contextuel (docs/03 §5 — `PropertyInspector`). */
export function PropertyInspector() {
  const selectedId = useStudioStore((s) => s.selectedId);
  const selectedKind = useStudioStore((s) => s.selectedKind);
  const scene = useStudioStore((s) => s.scene);
  const updateFurniture = useStudioStore((s) => s.updateFurniture);
  const updateWall = useStudioStore((s) => s.updateWall);
  const updateOpening = useStudioStore((s) => s.updateOpening);
  const addOpening = useStudioStore((s) => s.addOpening);
  const select = useStudioStore((s) => s.select);

  if (!selectedId || !selectedKind) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Sélectionnez un élément (clic, ou Tab dans la liste de la pièce) pour voir ses
        propriétés.
      </p>
    );
  }

  if (selectedKind === "furniture") {
    const item = scene.furniture.find((f) => f.id === selectedId);
    if (!item) return null;
    return (
      <div className="space-y-3">
        <p className="font-medium">{item.label}</p>
        <NumberField
          label="Largeur (cm)"
          value={item.footprint.w}
          onChange={(w) =>
            updateFurniture(item.id, { footprint: { ...item.footprint, w } })
          }
        />
        <NumberField
          label="Profondeur (cm)"
          value={item.footprint.d}
          onChange={(d) =>
            updateFurniture(item.id, { footprint: { ...item.footprint, d } })
          }
        />
        <NumberField
          label="X (cm)"
          value={Math.round(item.position.x * 10) / 10}
          onChange={(x) =>
            updateFurniture(item.id, { position: { ...item.position, x } })
          }
        />
        <NumberField
          label="Y (cm)"
          value={Math.round(item.position.y * 10) / 10}
          onChange={(y) =>
            updateFurniture(item.id, { position: { ...item.position, y } })
          }
        />
        <NumberField
          label="Rotation (°)"
          value={item.rotation}
          onChange={(rotation) =>
            updateFurniture(item.id, { rotation: ((rotation % 360) + 360) % 360 })
          }
        />
        {item.clearance ? (
          <p className="text-xs text-[var(--text-muted)]">
            Dégagement recommandé : {item.clearance.front} cm devant.
          </p>
        ) : null}
      </div>
    );
  }

  if (selectedKind === "wall") {
    const wall = scene.walls.find((w) => w.id === selectedId);
    if (!wall) return null;

    function addOpeningToWall(kind: "door" | "window") {
      const opening = createOpeningOnWall(wall!, kind);
      addOpening(opening);
      select(opening.id, "opening");
    }

    return (
      <div className="space-y-3">
        <p className="font-medium">Mur</p>
        <p className="text-sm text-[var(--text-muted)]">
          Longueur : {Math.round(wallLengthCm(wall))} cm
        </p>
        <NumberField
          label="Épaisseur (cm)"
          value={wall.thickness}
          onChange={(thickness) => updateWall(wall.id, { thickness })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wall.structural}
            onChange={(e) => updateWall(wall.id, { structural: e.target.checked })}
          />
          Mur porteur
        </label>
        {/* Pose une ouverture centrée sur ce mur, ajustable ensuite par les
            champs numériques — l'équivalent clavier du clic sur le mur
            (`room-canvas.tsx`) quand l'outil Porte/Fenêtre est actif. */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addOpeningToWall("door")}
          >
            Ajouter une porte
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addOpeningToWall("window")}
          >
            Ajouter une fenêtre
          </Button>
        </div>
      </div>
    );
  }

  const opening = scene.openings.find((o) => o.id === selectedId);
  if (!opening) return null;
  return (
    <div className="space-y-3">
      <p className="font-medium">{opening.kind === "door" ? "Porte" : "Fenêtre"}</p>
      <NumberField
        label="Position sur le mur (cm)"
        value={Math.round(opening.offsetCm * 10) / 10}
        onChange={(offsetCm) =>
          updateOpening(opening.id, { offsetCm: Math.max(0, offsetCm) })
        }
      />
      <NumberField
        label="Largeur (cm)"
        value={opening.widthCm}
        onChange={(widthCm) => updateOpening(opening.id, { widthCm })}
      />
      <NumberField
        label="Hauteur (cm)"
        value={opening.heightCm}
        onChange={(heightCm) => updateOpening(opening.id, { heightCm })}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = React.useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </div>
  );
}
