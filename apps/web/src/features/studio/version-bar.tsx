"use client";

import * as React from "react";
import type { Scene } from "@atelier/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import {
  duplicateRoomVersionAction,
  getRoomVersionSceneAction,
  renameRoomVersionAction,
  restoreRoomVersionAction,
  saveRoomVersionAction,
} from "./actions";
import { ScenePreview } from "./scene-preview";
import type { RoomVersionSummary } from "./data";
import { useStudioStore } from "./store";

/**
 * Barre de versions (docs/03 §4.4) : enregistrer, dupliquer, renommer,
 * restaurer, comparer. Une version est toujours un ajout, jamais une
 * réécriture (docs/04 §3.6, SIM-09) — « restaurer » crée une nouvelle version
 * à partir d'une ancienne plutôt que de revenir en arrière silencieusement.
 */
export function VersionBar({
  roomId,
  initialVersions,
  initialCurrentVersionId,
}: {
  roomId: string;
  initialVersions: RoomVersionSummary[];
  initialCurrentVersionId: string | null;
}) {
  const scene = useStudioStore((s) => s.scene);
  const dirty = useStudioStore((s) => s.dirty);
  const markSaved = useStudioStore((s) => s.markSaved);
  const loadScene = useStudioStore((s) => s.loadScene);

  const [versions, setVersions] = React.useState(initialVersions);
  const [currentVersionId, setCurrentVersionId] = React.useState(initialCurrentVersionId);
  const [pending, setPending] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [labelDraft, setLabelDraft] = React.useState("");
  const [compareOpen, setCompareOpen] = React.useState(false);

  const currentIndex = versions.findIndex((v) => v.id === currentVersionId);
  const current = versions[currentIndex];

  function openAtIndex(index: number) {
    const version = versions[index];
    if (!version) return;
    setCurrentVersionId(version.id);
    void getRoomVersionSceneAction(version.id).then((s) => {
      if (s) loadScene(s);
    });
  }

  async function handleSave() {
    setPending(true);
    try {
      const label = window.prompt("Nom de cette version", "Nouvelle version") ?? "";
      if (!label.trim()) return;
      const { id } = await saveRoomVersionAction(roomId, scene, label);
      setVersions((v) => [
        { id, label: label.trim(), notes: null, createdAt: new Date() },
        ...v,
      ]);
      setCurrentVersionId(id);
      markSaved();
    } finally {
      setPending(false);
    }
  }

  async function handleDuplicate() {
    if (!current) return;
    setPending(true);
    try {
      const { id } = await duplicateRoomVersionAction(roomId, current.id);
      setVersions((v) => [{ ...current, id, label: `${current.label} (copie)` }, ...v]);
      setCurrentVersionId(id);
    } finally {
      setPending(false);
    }
  }

  async function handleRename() {
    if (!current || !labelDraft.trim()) return;
    setPending(true);
    try {
      await renameRoomVersionAction(roomId, current.id, labelDraft);
      setVersions((v) =>
        v.map((ver) =>
          ver.id === current.id ? { ...ver, label: labelDraft.trim() } : ver,
        ),
      );
      setRenaming(false);
    } finally {
      setPending(false);
    }
  }

  async function handleRestore(versionId: string) {
    setPending(true);
    try {
      const source = versions.find((v) => v.id === versionId);
      const { id } = await restoreRoomVersionAction(roomId, versionId);
      const restoredScene = await getRoomVersionSceneAction(id);
      setVersions((v) => [
        {
          id,
          label: `${source?.label ?? "Version"} (restaurée)`,
          notes: null,
          createdAt: new Date(),
        },
        ...v,
      ]);
      setCurrentVersionId(id);
      if (restoredScene) loadScene(restoredScene);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-[var(--border)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={currentIndex >= versions.length - 1 || currentIndex === -1}
          onClick={() => openAtIndex(currentIndex + 1)}
        >
          ◀ Plus ancienne
        </Button>
        <span className="text-sm text-[var(--text-muted)]">
          {current ? current.label : "Aucune version"}
          {dirty ? " · non enregistrée" : ""}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={currentIndex <= 0}
          onClick={() => openAtIndex(currentIndex - 1)}
        >
          Plus récente ▶
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={pending}
        >
          Enregistrer (⌘S)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void handleDuplicate()}
          disabled={pending || !current}
        >
          Dupliquer
        </Button>
        {renaming ? (
          <span className="flex items-center gap-1">
            <Input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              className="h-9 w-40"
              aria-label="Nouveau nom de la version"
            />
            <Button type="button" size="sm" onClick={() => void handleRename()}>
              OK
            </Button>
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!current}
            onClick={() => {
              setLabelDraft(current?.label ?? "");
              setRenaming(true);
            }}
          >
            Renommer
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setCompareOpen((v) => !v)}
          aria-pressed={compareOpen}
        >
          Comparer
        </Button>
      </div>

      {versions.length > 1 ? (
        <ul className="flex flex-wrap gap-1">
          {versions.map((v, i) => (
            <li key={v.id}>
              <Button
                type="button"
                size="sm"
                variant={v.id === currentVersionId ? "primary" : "ghost"}
                onClick={() => openAtIndex(i)}
              >
                {v.label}
              </Button>
              {v.id !== currentVersionId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={() => void handleRestore(v.id)}
                >
                  restaurer
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {compareOpen ? <CompareView roomVersions={versions} currentScene={scene} /> : null}
    </div>
  );
}

function CompareView({
  roomVersions,
  currentScene,
}: {
  roomVersions: RoomVersionSummary[];
  currentScene: Scene;
}) {
  const [beforeId, setBeforeId] = React.useState(
    roomVersions[1]?.id ?? roomVersions[0]?.id ?? "",
  );
  const [beforeScene, setBeforeScene] = React.useState<Scene | null>(null);

  React.useEffect(() => {
    if (!beforeId) return;
    void getRoomVersionSceneAction(beforeId).then(setBeforeScene);
  }, [beforeId]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        Comparer avec
        <select
          value={beforeId}
          onChange={(e) => setBeforeId(e.target.value)}
          className="rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-1 text-sm"
        >
          {roomVersions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      {beforeScene ? (
        <div className="h-72">
          <BeforeAfterSlider
            beforeLabel="Avant"
            afterLabel="Après"
            before={<ScenePreview scene={beforeScene} />}
            after={<ScenePreview scene={currentScene} />}
            className="h-full"
          />
        </div>
      ) : null}
    </div>
  );
}
