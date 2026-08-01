"use client";

import * as React from "react";
import { BOARD_HEIGHT, BOARD_WIDTH, type MoodboardTransform } from "@atelier/domain";
import { cn } from "@atelier/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoodboardItemView } from "./moodboard-data";
import {
  addLibraryItemToMoodboardAction,
  removeMoodboardItemAction,
  searchLibraryAction,
  updateMoodboardItemTransformAction,
} from "./moodboard-actions";
import type { LibrarySearchResult } from "@/features/library/data";

const STEP = 20;
const STEP_LARGE = 100;
const ROTATE_STEP = 15;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampTransform(t: MoodboardTransform): MoodboardTransform {
  return {
    ...t,
    x: clamp(t.x, 0, BOARD_WIDTH - t.w),
    y: clamp(t.y, 0, BOARD_HEIGHT - t.h),
  };
}

function slugifyFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "moodboard";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Échec du chargement de l'image : ${src}`));
    img.src = src;
  });
}

/**
 * Éditeur de moodboard (docs/05 M8) : glisser-déposer libre sur un plateau
 * DOM (positions en pourcentage de `BOARD_WIDTH`/`BOARD_HEIGHT`,
 * `@atelier/domain`), plus une liste accessible parallèle qui mirror le
 * même vocabulaire clavier que `accessible-scene-list.tsx`/`studio-editor.tsx`
 * (M4) : flèches déplacent, R pivote, Suppr retire, Échap désélectionne. Le
 * plateau visuel est `aria-hidden` — un canevas glisser-déposer est opaque
 * au clavier/lecteur d'écran, la liste porte toute l'interaction accessible.
 *
 * Édition locale, enregistrement explicite (Cmd/Ctrl+S ou bouton) : chaque
 * `MoodboardItem` déplacé est revalidé et persisté par
 * `updateMoodboardItemTransformAction`, jamais de sauvegarde silencieuse par
 * évènement.
 */
export function MoodboardEditor({
  moodboardId,
  title,
  initialItems,
}: {
  moodboardId: string;
  title: string;
  initialItems: MoodboardItemView[];
}) {
  const [items, setItems] = React.useState(initialItems);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<LibrarySearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const boardRef = React.useRef<HTMLDivElement>(null);
  const dragState = React.useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const updateItemTransform = React.useCallback(
    (id: string, transform: MoodboardTransform) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, transform } : it)));
      setDirtyIds((prev) => new Set(prev).add(id));
    },
    [],
  );

  const handleSave = React.useCallback(async () => {
    if (dirtyIds.size === 0) return;
    setSaving(true);
    setStatus("Enregistrement…");
    try {
      const ids = [...dirtyIds];
      const results = await Promise.all(
        ids.map((id) => {
          const item = items.find((it) => it.id === id);
          if (!item) return Promise.resolve({ ok: true });
          return updateMoodboardItemTransformAction(moodboardId, id, item.transform);
        }),
      );
      if (results.every((r) => r.ok)) {
        setDirtyIds(new Set());
        setStatus("Enregistré.");
      } else {
        setStatus("Certaines modifications n'ont pas pu être enregistrées.");
      }
    } finally {
      setSaving(false);
    }
  }, [dirtyIds, items, moodboardId]);

  // Glisser-déposer (souris/tactile) — conversion pixel → unités du plateau
  // via la taille réelle du plateau à l'écran (indépendante du zoom).
  React.useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      const drag = dragState.current;
      const board = boardRef.current;
      if (!drag || !board) return;
      const rect = board.getBoundingClientRect();
      const scaleX = BOARD_WIDTH / rect.width;
      const scaleY = BOARD_HEIGHT / rect.height;
      const dx = (e.clientX - drag.startClientX) * scaleX;
      const dy = (e.clientY - drag.startClientY) * scaleY;
      setItems((prev) =>
        prev.map((it) =>
          it.id === drag.id
            ? {
                ...it,
                transform: clampTransform({
                  ...it.transform,
                  x: drag.startX + dx,
                  y: drag.startY + dy,
                }),
              }
            : it,
        ),
      );
    }
    function handlePointerUp() {
      if (dragState.current) {
        setDirtyIds((prev) => new Set(prev).add(dragState.current!.id));
      }
      dragState.current = null;
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function startDrag(item: MoodboardItemView, e: React.PointerEvent) {
    setSelectedId(item.id);
    dragState.current = {
      id: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: item.transform.x,
      startY: item.transform.y,
    };
  }

  const removeItem = React.useCallback(
    async (id: string) => {
      const result = await removeMoodboardItemAction(moodboardId, id);
      if (!result.ok) return;
      setItems((prev) => prev.filter((it) => it.id !== id));
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedId(null);
    },
    [moodboardId],
  );

  // Clavier : mêmes raccourcis que l'éditeur de pièce (M4).
  React.useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (!selectedId) return;
      const selected = items.find((it) => it.id === selectedId);
      if (!selected) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void removeItem(selectedId);
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? STEP_LARGE : STEP;
        const deltas: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const [dx, dy] = deltas[e.key]!;
        updateItemTransform(
          selectedId,
          clampTransform({
            ...selected.transform,
            x: selected.transform.x + dx,
            y: selected.transform.y + dy,
          }),
        );
        return;
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        const delta = e.shiftKey ? -ROTATE_STEP : ROTATE_STEP;
        updateItemTransform(selectedId, {
          ...selected.transform,
          rotation: (selected.transform.rotation + delta) % 360,
        });
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [selectedId, items, updateItemTransform, removeItem, handleSave]);

  async function runSearch(value: string) {
    setQuery(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchLibraryAction(trimmed));
    } finally {
      setSearching(false);
    }
  }

  // Export PNG (docs/05 M8) : recomposé sur un canevas hors-écran à partir
  // des mêmes transforms que le rendu DOM (`BOARD_WIDTH`/`BOARD_HEIGHT`
  // comme repère commun), donc fidèle au plateau affiché — pas une capture
  // d'écran, un second rendu des mêmes données.
  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = BOARD_WIDTH;
      canvas.height = BOARD_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setExportError("Export impossible sur ce navigateur.");
        return;
      }

      const styles = getComputedStyle(document.documentElement);
      const surfaceColor = styles.getPropertyValue("--surface").trim() || "#f5f4f2";
      const surfaceRaisedColor =
        styles.getPropertyValue("--surface-raised").trim() || "#ffffff";
      const textMutedColor = styles.getPropertyValue("--text-muted").trim() || "#6b6b6b";

      ctx.fillStyle = surfaceColor;
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      const images = new Map<string, HTMLImageElement>();
      await Promise.all(
        items.map(async (item) => {
          if (!item.imageUrl) return;
          try {
            images.set(item.id, await loadImage(item.imageUrl));
          } catch {
            // Image indisponible (URL présignée expirée, réseau) : un
            // rectangle de repli est dessiné à sa place plus bas — l'export
            // ne doit jamais échouer entièrement pour une seule image.
          }
        }),
      );

      const sorted = [...items].sort((a, b) => a.transform.z - b.transform.z);
      for (const item of sorted) {
        const { x, y, w, h, rotation } = item.transform;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        const drawX = -w / 2;
        const drawY = -h / 2;

        const image = images.get(item.id);
        if (item.colorHex) {
          ctx.fillStyle = item.colorHex;
          ctx.fillRect(drawX, drawY, w, h);
        } else if (image) {
          ctx.drawImage(image, drawX, drawY, w, h);
        } else {
          ctx.fillStyle = surfaceRaisedColor;
          ctx.fillRect(drawX, drawY, w, h);
          ctx.fillStyle = textMutedColor;
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(item.label ?? "", 0, 0, w - 8);
        }
        ctx.restore();
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) {
        setExportError("L'export a échoué. Réessayez.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugifyFilename(title)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("L'export a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  }

  async function handleAddItem(slug: string) {
    const result = await addLibraryItemToMoodboardAction(moodboardId, slug);
    if (!result.ok || !result.itemId || !result.transform) return;
    setItems((prev) => [
      ...prev,
      {
        id: result.itemId!,
        libraryItemSlug: result.libraryItemSlug ?? slug,
        imageUrl: result.imageUrl ?? null,
        colorHex: null,
        label: result.label ?? slug,
        transform: result.transform!,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        <div
          ref={boardRef}
          aria-hidden="true"
          className="relative w-full overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)]"
          style={{ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => startDrag(item, e)}
              className={cn(
                "absolute cursor-grab touch-none overflow-hidden rounded-[var(--radius-atelier)] border-2 shadow-sm active:cursor-grabbing",
                selectedId === item.id ? "border-[var(--accent)]" : "border-transparent",
              )}
              style={{
                left: `${(item.transform.x / BOARD_WIDTH) * 100}%`,
                top: `${(item.transform.y / BOARD_HEIGHT) * 100}%`,
                width: `${(item.transform.w / BOARD_WIDTH) * 100}%`,
                height: `${(item.transform.h / BOARD_HEIGHT) * 100}%`,
                zIndex: item.transform.z,
                transform: `rotate(${item.transform.rotation}deg)`,
                backgroundColor: item.colorHex ?? undefined,
              }}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : !item.colorHex ? (
                <div className="flex h-full w-full items-center justify-center bg-[var(--surface-raised)] p-1 text-center text-[10px] text-[var(--text-muted)]">
                  {item.label}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={dirtyIds.size === 0 || saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={exporting || items.length === 0}
            onClick={() => void handleExport()}
          >
            {exporting ? "Export…" : "Exporter en PNG"}
          </Button>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-[var(--text-muted)]"
          >
            {status}
          </p>
        </div>
        {exportError ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {exportError}
          </p>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="moodboard-add-search" className="text-sm font-medium">
            Ajouter une fiche bibliothèque
          </label>
          <Input
            id="moodboard-add-search"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => void runSearch(e.target.value)}
          />
          {searching ? (
            <p className="text-sm text-[var(--text-muted)]">Recherche…</p>
          ) : results.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {results.map((r) => (
                <li
                  key={r.slug}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{r.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleAddItem(r.slug)}
                  >
                    Ajouter
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <aside
        className="w-full shrink-0 space-y-2 lg:w-72"
        aria-label="Éléments du moodboard"
      >
        <h2 className="text-sm font-medium">Éléments</h2>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Ce moodboard est vide.</p>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onFocus={() => setSelectedId(item.id)}
                  onClick={() => setSelectedId(item.id)}
                  aria-current={selectedId === item.id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[var(--radius-atelier)] border px-2 py-1.5 text-left text-sm",
                    selectedId === item.id
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-strong)]"
                      : "border-transparent hover:bg-[var(--surface)]",
                  )}
                >
                  {item.colorHex ? (
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full border border-[var(--border)]"
                      style={{ backgroundColor: item.colorHex }}
                    />
                  ) : null}
                  <span className="truncate">{item.label ?? item.libraryItemSlug}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-[var(--text-muted)]">
          Flèches : déplacer (Maj = pas large) · R : pivoter · Suppr : retirer ·
          Cmd/Ctrl+S : enregistrer.
        </p>
      </aside>
    </div>
  );
}
