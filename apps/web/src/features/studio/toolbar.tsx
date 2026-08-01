"use client";

import * as React from "react";
import { FURNITURE_CATALOG } from "@atelier/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFurnitureFromCatalog,
  createRectangularRoomWalls,
  defaultPlacementPoint,
} from "./scene-utils";
import type { StudioTool } from "./store";
import { useStudioStore } from "./store";

/**
 * Palette d'outils (docs/03 §4.4). La création de pièce et de mobilier passe
 * par une saisie numérique et un bouton « ajouter », plutôt que par un tracé
 * ou un dépôt à la souris : chaque ajout fonctionne au clic **ou** au clavier
 * (Tab puis Entrée/Espace), le meuble arrive posé et se termine de placer aux
 * flèches — c'est ce qui rend « une pièce complète se construit entièrement
 * au clavier » possible (docs/05, critère d'acceptation M4).
 */

const TOOLS: { id: StudioTool; label: string; shortcut: string }[] = [
  { id: "select", label: "Sélection", shortcut: "V" },
  { id: "room", label: "Pièce", shortcut: "R" },
  { id: "door", label: "Porte", shortcut: "D" },
  { id: "window", label: "Fenêtre", shortcut: "F" },
  { id: "furniture", label: "Mobilier", shortcut: "M" },
  { id: "pan", label: "Panoramique", shortcut: "Espace" },
];

export function Toolbar() {
  const tool = useStudioStore((s) => s.tool);
  const setTool = useStudioStore((s) => s.setTool);
  const scene = useStudioStore((s) => s.scene);
  const addWall = useStudioStore((s) => s.addWall);
  const addFurniture = useStudioStore((s) => s.addFurniture);
  const select = useStudioStore((s) => s.select);
  const [widthCm, setWidthCm] = React.useState("400");
  const [depthCm, setDepthCm] = React.useState("300");

  function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const width = Number(widthCm);
    const depth = Number(depthCm);
    if (!(width > 0) || !(depth > 0)) return;
    for (const wall of createRectangularRoomWalls(width, depth)) addWall(wall);
    setTool("select");
  }

  function handleAddFurniture(slug: string) {
    const item = createFurnitureFromCatalog(slug, defaultPlacementPoint(scene));
    if (!item) return;
    addFurniture(item);
    select(item.id, "furniture");
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="toolbar"
        aria-label="Outils de l'atelier"
        className="flex flex-wrap gap-1"
      >
        {TOOLS.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tool === t.id ? "primary" : "secondary"}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tool === "room" && scene.walls.length === 0 ? (
        <form
          onSubmit={handleCreateRoom}
          className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] p-3"
        >
          <p className="text-sm font-medium">Nouvelle pièce rectangulaire</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="room-width">Largeur (cm)</Label>
              <Input
                id="room-width"
                type="number"
                min={50}
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="room-depth">Profondeur (cm)</Label>
              <Input
                id="room-depth"
                type="number"
                min={50}
                value={depthCm}
                onChange={(e) => setDepthCm(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="sm">
            Créer la pièce
          </Button>
        </form>
      ) : null}

      {tool === "door" || tool === "window" ? (
        <p className="text-xs text-[var(--text-muted)]">
          Cliquez sur un mur pour y poser {tool === "door" ? "une porte" : "une fenêtre"}{" "}
          — ou sélectionnez un mur (Tab dans la liste des objets) puis « Ajouter
          {tool === "door" ? " une porte" : " une fenêtre"} » dans ses propriétés.
        </p>
      ) : null}

      {tool === "furniture" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Catalogue</p>
          <ul className="grid grid-cols-2 gap-1">
            {FURNITURE_CATALOG.map((entry) => (
              <li key={entry.slug}>
                <button
                  type="button"
                  onClick={() => handleAddFurniture(entry.slug)}
                  className="w-full rounded-[var(--radius-atelier)] border border-[var(--border)] px-2 py-1.5 text-left text-xs hover:bg-[var(--surface)]"
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--text-muted)]">
            Le meuble est posé au centre de la pièce — déplacez-le ensuite (flèches) ou à
            la souris.
          </p>
        </div>
      ) : null}
    </div>
  );
}
