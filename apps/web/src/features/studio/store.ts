import { create } from "zustand";
import {
  emptyScene,
  type FurnitureItem,
  type Opening,
  type Scene,
  type Wall,
} from "@atelier/domain";

/**
 * État client de l'atelier (docs/05 M4).
 *
 * Une pile d'annuler/refaire par instantané complet de la scène : les scènes
 * sont petites (quelques dizaines d'objets, JSON compact), donc l'instantané
 * complet reste bien plus simple qu'un journal de diffs, pour un coût
 * mémoire négligeable.
 */

export type SelectionKind = "wall" | "opening" | "furniture" | null;
export type StudioTool =
  "select" | "room" | "wall" | "door" | "window" | "furniture" | "pan";

export const KEYBOARD_STEP_CM = 0.1;
export const KEYBOARD_STEP_LARGE_CM = 10;
export const DEFAULT_GRID_CM = 10;
export const ROTATE_STEP_DEG = 15;
const MAX_HISTORY = 50;

export interface StudioState {
  scene: Scene;
  selectedId: string | null;
  selectedKind: SelectionKind;
  tool: StudioTool;
  gridCm: number;
  snapEnabled: boolean;
  past: Scene[];
  future: Scene[];
  dirty: boolean;

  loadScene: (scene: Scene) => void;
  setTool: (tool: StudioTool) => void;
  toggleSnap: () => void;
  select: (id: string | null, kind: SelectionKind) => void;

  addWall: (wall: Wall) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  removeWall: (id: string) => void;

  addOpening: (opening: Opening) => void;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  removeOpening: (id: string) => void;

  addFurniture: (item: FurnitureItem) => void;
  updateFurniture: (id: string, patch: Partial<FurnitureItem>) => void;
  removeFurniture: (id: string) => void;

  moveSelected: (dx: number, dy: number) => void;
  rotateSelected: (deltaDeg: number) => void;
  removeSelected: () => void;

  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

export const useStudioStore = create<StudioState>()((set, get) => {
  function mutate(mutator: (scene: Scene) => Scene) {
    const { scene, past } = get();
    set({
      scene: mutator(scene),
      past: [...past, scene].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  }

  return {
    scene: emptyScene(),
    selectedId: null,
    selectedKind: null,
    tool: "select",
    gridCm: DEFAULT_GRID_CM,
    snapEnabled: true,
    past: [],
    future: [],
    dirty: false,

    loadScene: (scene) =>
      set({
        scene,
        past: [],
        future: [],
        dirty: false,
        selectedId: null,
        selectedKind: null,
      }),

    setTool: (tool) => set({ tool }),
    toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
    select: (id, kind) => set({ selectedId: id, selectedKind: id ? kind : null }),

    addWall: (wall) => mutate((scene) => ({ ...scene, walls: [...scene.walls, wall] })),
    updateWall: (id, patch) =>
      mutate((scene) => ({
        ...scene,
        walls: scene.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),
    removeWall: (id) =>
      mutate((scene) => ({
        ...scene,
        walls: scene.walls.filter((w) => w.id !== id),
        openings: scene.openings.filter((o) => o.wallId !== id),
      })),

    addOpening: (opening) =>
      mutate((scene) => ({ ...scene, openings: [...scene.openings, opening] })),
    updateOpening: (id, patch) =>
      mutate((scene) => ({
        ...scene,
        openings: scene.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })),
    removeOpening: (id) =>
      mutate((scene) => ({
        ...scene,
        openings: scene.openings.filter((o) => o.id !== id),
      })),

    addFurniture: (item) =>
      mutate((scene) => ({ ...scene, furniture: [...scene.furniture, item] })),
    updateFurniture: (id, patch) =>
      mutate((scene) => ({
        ...scene,
        furniture: scene.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      })),
    removeFurniture: (id) =>
      mutate((scene) => ({
        ...scene,
        furniture: scene.furniture.filter((f) => f.id !== id),
      })),

    // Le magnétisme de grille (`gridCm`/`snapEnabled`) n'intervient que sur les
    // manipulations à la souris (voir `room-canvas.tsx`) : au clavier, le pas
    // de 1/10 cm EST la précision demandée (docs/03 §6) — le lui appliquer un
    // arrondi à la grille (10 cm par défaut) l'annulerait purement et simplement.
    moveSelected: (dx, dy) => {
      const { selectedId, selectedKind } = get();
      if (!selectedId || !selectedKind) return;

      if (selectedKind === "furniture") {
        mutate((scene) => ({
          ...scene,
          furniture: scene.furniture.map((f) =>
            f.id === selectedId
              ? { ...f, position: { x: f.position.x + dx, y: f.position.y + dy } }
              : f,
          ),
        }));
      } else if (selectedKind === "wall") {
        mutate((scene) => ({
          ...scene,
          walls: scene.walls.map((w) =>
            w.id === selectedId
              ? {
                  ...w,
                  a: { x: w.a.x + dx, y: w.a.y + dy },
                  b: { x: w.b.x + dx, y: w.b.y + dy },
                }
              : w,
          ),
        }));
      } else if (selectedKind === "opening") {
        mutate((scene) => ({
          ...scene,
          openings: scene.openings.map((o) =>
            o.id === selectedId ? { ...o, offsetCm: Math.max(0, o.offsetCm + dx) } : o,
          ),
        }));
      }
    },

    rotateSelected: (deltaDeg) => {
      const { selectedId, selectedKind } = get();
      if (!selectedId || selectedKind !== "furniture") return;
      mutate((scene) => ({
        ...scene,
        furniture: scene.furniture.map((f) =>
          f.id === selectedId
            ? { ...f, rotation: (f.rotation + deltaDeg + 360) % 360 }
            : f,
        ),
      }));
    },

    removeSelected: () => {
      const { selectedId, selectedKind } = get();
      if (!selectedId || !selectedKind) return;
      if (selectedKind === "wall") get().removeWall(selectedId);
      else if (selectedKind === "opening") get().removeOpening(selectedId);
      else if (selectedKind === "furniture") get().removeFurniture(selectedId);
      set({ selectedId: null, selectedKind: null });
    },

    undo: () => {
      const { past, scene, future } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({
        scene: previous,
        past: past.slice(0, -1),
        future: [scene, ...future],
        dirty: true,
      });
    },
    redo: () => {
      const { future, scene, past } = get();
      const next = future[0];
      if (!next) return;
      set({ scene: next, future: future.slice(1), past: [...past, scene], dirty: true });
    },
    markSaved: () => set({ dirty: false }),
  };
});
