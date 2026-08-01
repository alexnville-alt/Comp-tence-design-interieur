"use client";

import * as React from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import {
  pointAtOffset,
  wallAngleRad,
  wallLengthCm,
  furnitureCorners,
  snapPointToGrid,
} from "@atelier/domain";
import { createOpeningOnWall } from "./scene-utils";
import { useStudioStore } from "./store";

/**
 * Canevas 2D de l'atelier (docs/05 M4, ADR-0006). Chargé uniquement côté
 * client via `dynamic(..., { ssr: false })` dans `studio-editor.tsx` — le
 * canevas ne pèse rien tant qu'on n'ouvre pas l'atelier (docs/02 §10).
 *
 * Le canevas est **une vue parmi d'autres** de la même scène : toute action
 * possible ici (déplacer, pivoter, ajouter) est aussi possible depuis
 * `AccessibleSceneList`, entièrement au clavier — voir docs/03 §6.
 */

const PX_PER_CM = 0.5;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const STAGE_WIDTH = 900;
const STAGE_HEIGHT = 560;

export function RoomCanvas() {
  const scene = useStudioStore((s) => s.scene);
  const tool = useStudioStore((s) => s.tool);
  const selectedId = useStudioStore((s) => s.selectedId);
  const gridCm = useStudioStore((s) => s.gridCm);
  const snapEnabled = useStudioStore((s) => s.snapEnabled);
  const select = useStudioStore((s) => s.select);
  const updateFurniture = useStudioStore((s) => s.updateFurniture);
  const addOpening = useStudioStore((s) => s.addOpening);

  const [stageScale, setStageScale] = React.useState(1);
  const [stagePos, setStagePos] = React.useState({ x: 40, y: 40 });

  function toSceneCoords(pointer: { x: number; y: number }) {
    const point = {
      x: (pointer.x - stagePos.x) / stageScale / PX_PER_CM,
      y: (pointer.y - stagePos.y) / stageScale / PX_PER_CM,
    };
    // Le magnétisme de grille s'applique aux manipulations à la souris — la
    // précision fine au clavier (1/10 cm) est un chemin séparé, non affecté
    // (voir la note dans `store.ts`).
    return snapEnabled ? snapPointToGrid(point, gridCm) : point;
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, stageScale * (1 + direction * 0.1)),
    );
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    };
    setStageScale(nextScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * nextScale,
      y: pointer.y - mousePointTo.y * nextScale,
    });
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (e.target !== e.target.getStage()) return; // un objet a déjà géré le clic
    select(null, null);
  }

  function handleWallClick(wallId: string) {
    return (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      const wall = scene.walls.find((w) => w.id === wallId);
      if (!wall) return;

      if (tool === "door" || tool === "window") {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        const scenePoint = pointer ? toSceneCoords(pointer) : wall.a;
        const length = wallLengthCm(wall);
        const widthCm = tool === "door" ? 90 : 120;
        const clickOffset =
          ((scenePoint.x - wall.a.x) * (wall.b.x - wall.a.x) +
            (scenePoint.y - wall.a.y) * (wall.b.y - wall.a.y)) /
          (length || 1);
        const offsetCm = clickOffset - widthCm / 2;
        addOpening(createOpeningOnWall(wall, tool, offsetCm));
        return;
      }
      select(wallId, "wall");
    };
  }

  return (
    <Stage
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      scaleX={stageScale}
      scaleY={stageScale}
      x={stagePos.x}
      y={stagePos.y}
      draggable={tool === "pan" || tool === "select"}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onTap={handleStageClick}
      onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
      role="img"
      aria-label={`Plan de la pièce, ${scene.walls.length} murs, ${scene.furniture.length} meubles`}
    >
      <Layer>
        <GridLines gridCm={gridCm} />
        {scene.walls.map((wall) => (
          <Line
            key={wall.id}
            points={[
              wall.a.x * PX_PER_CM,
              wall.a.y * PX_PER_CM,
              wall.b.x * PX_PER_CM,
              wall.b.y * PX_PER_CM,
            ]}
            stroke={selectedId === wall.id ? "var(--accent, #c1592b)" : "#57534e"}
            strokeWidth={Math.max(2, wall.thickness * PX_PER_CM)}
            lineCap="square"
            onClick={handleWallClick(wall.id)}
            onTap={handleWallClick(wall.id)}
          />
        ))}
        {scene.openings.map((opening) => {
          const wall = scene.walls.find((w) => w.id === opening.wallId);
          if (!wall) return null;
          const mid = pointAtOffset(wall, opening.offsetCm + opening.widthCm / 2);
          const angle = (wallAngleRad(wall) * 180) / Math.PI;
          const lengthPx = opening.widthCm * PX_PER_CM;
          return (
            <Line
              key={opening.id}
              points={[-lengthPx / 2, 0, lengthPx / 2, 0]}
              x={mid.x * PX_PER_CM}
              y={mid.y * PX_PER_CM}
              rotation={angle}
              stroke={opening.kind === "door" ? "#f5f1ea" : "#7dd3fc"}
              strokeWidth={Math.max(4, wall.thickness * PX_PER_CM)}
            />
          );
        })}
        {scene.furniture.map((item) => {
          const corners = furnitureCorners(item);
          const selected = selectedId === item.id;
          return (
            <React.Fragment key={item.id}>
              <Rect
                x={item.position.x * PX_PER_CM}
                y={item.position.y * PX_PER_CM}
                width={item.footprint.w * PX_PER_CM}
                height={item.footprint.d * PX_PER_CM}
                offsetX={(item.footprint.w * PX_PER_CM) / 2}
                offsetY={(item.footprint.d * PX_PER_CM) / 2}
                rotation={item.rotation}
                fill={selected ? "#f4a17a" : "#e7ded1"}
                stroke={selected ? "#c1592b" : "#a8998a"}
                strokeWidth={selected ? 2 : 1}
                draggable
                onClick={(e) => {
                  e.cancelBubble = true;
                  select(item.id, "furniture");
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  select(item.id, "furniture");
                }}
                onDragEnd={(e) => {
                  const raw = {
                    x: e.target.x() / PX_PER_CM,
                    y: e.target.y() / PX_PER_CM,
                  };
                  const position = snapEnabled ? snapPointToGrid(raw, gridCm) : raw;
                  updateFurniture(item.id, { position });
                }}
              />
              <Text
                text={item.label}
                x={corners[0].x * PX_PER_CM}
                y={corners[0].y * PX_PER_CM - 14}
                fontSize={11}
                fill="#57534e"
                listening={false}
              />
            </React.Fragment>
          );
        })}
      </Layer>
    </Stage>
  );
}

// Bornée à une pièce généreuse (15 m) : une grille infinie ajouterait des
// milliers de nœuds Konva en permanence, hors de propos pour le budget 60 fps
// (docs/05 : 60 fps avec 150 objets), pour un repère visuel qui n'a de sens
// qu'à l'échelle d'une pièce.
const GRID_EXTENT_CM = 1500;

function GridLines({ gridCm }: { gridCm: number }) {
  const spacingPx = gridCm * PX_PER_CM;
  if (spacingPx < 4) return null; // trop dense une fois dézoomé : on masque plutôt que de saturer
  const extent = GRID_EXTENT_CM * PX_PER_CM;
  const lines: React.ReactElement[] = [];
  for (let x = -extent; x <= extent; x += spacingPx) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, -extent, x, extent]}
        stroke="#efe9df"
        strokeWidth={1}
        listening={false}
      />,
    );
  }
  for (let y = -extent; y <= extent; y += spacingPx) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[-extent, y, extent, y]}
        stroke="#efe9df"
        strokeWidth={1}
        listening={false}
      />,
    );
  }
  return <>{lines}</>;
}
