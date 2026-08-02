"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectAssetView } from "./data";
import {
  calibrateProjectAssetAction,
  confirmProjectAssetUploadAction,
  requestProjectAssetUploadAction,
} from "./asset-actions";

type Step = "idle" | "uploading" | "processing" | "error";

const STEP_MESSAGES: Record<Step, string> = {
  idle: "",
  uploading: "Téléversement en cours…",
  processing: "Vérification et préparation de l'image…",
  error: "",
};

/**
 * Plan de référence d'une pièce (docs/05 M10, PROJ-02) : import (image
 * seule — voir la note sur le PDF dans `schema.prisma`), puis calibrage par
 * deux points cliqués sur l'image + une cote réelle connue. Les coordonnées
 * sont capturées dans le repère **pixel natif** de l'image stockée
 * (`naturalWidth`/`naturalHeight`), jamais dans le repère d'affichage CSS —
 * c'est ce que le serveur revalide contre `Asset.width`/`height`.
 */
export function PlanPanel({
  projectId,
  roomId,
  initialPlan,
}: {
  projectId: string;
  roomId: string;
  initialPlan: ProjectAssetView | null;
}) {
  const router = useRouter();
  // Pas d'état local pour `plan` : `router.refresh()` (après import ou
  // calibrage) fait rejouer le composant serveur parent, qui repasse un
  // `initialPlan` à jour — un `useState` figerait la valeur au premier rendu.
  const plan = initialPlan;
  const [step, setStep] = React.useState<Step>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [points, setPoints] = React.useState<{ x: number; y: number }[]>([]);
  const [refLengthCm, setRefLengthCm] = React.useState("");
  const [calibrating, setCalibrating] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setStep("uploading");
    try {
      const request = await requestProjectAssetUploadAction(file.type, file.size);
      if (!request.ok || !request.uploadUrl || !request.storageKey) {
        setError(
          request.error === "invalid_type"
            ? "Format non pris en charge — utilisez une image JPEG, PNG ou WebP (un PDF doit d'abord être exporté en image)."
            : request.error === "too_large"
              ? "Ce plan dépasse 12 Mo."
              : "Le téléversement a échoué. Réessayez.",
        );
        setStep("error");
        return;
      }

      const putResponse = await fetch(request.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putResponse.ok) {
        setError("Le téléversement a échoué. Réessayez.");
        setStep("error");
        return;
      }

      setStep("processing");
      const confirmed = await confirmProjectAssetUploadAction({
        storageKey: request.storageKey,
        projectId,
        roomId,
        kind: "FLOOR_PLAN",
      });
      if (!confirmed.ok || !confirmed.projectAssetId) {
        setError(
          confirmed.error === "invalid_image"
            ? "Ce fichier n'est pas une image valide."
            : "Le traitement du plan a échoué. Réessayez.",
        );
        setStep("error");
        return;
      }

      setStep("idle");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setStep("error");
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const point = {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
    setPoints((prev) => (prev.length >= 2 ? [point] : [...prev, point]));
  }

  async function handleCalibrate(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || points.length !== 2) return;
    const length = Number(refLengthCm);
    if (!(length > 0)) return;

    setCalibrating(true);
    setError(null);
    try {
      const result = await calibrateProjectAssetAction(
        plan.id,
        points[0],
        points[1],
        length,
      );
      if (!result.ok) {
        setError("Le calibrage a échoué — vérifiez les points et la cote saisie.");
        return;
      }
      setPoints([]);
      setRefLengthCm("");
      router.refresh();
    } finally {
      setCalibrating(false);
    }
  }

  const pending = step === "uploading" || step === "processing";

  if (!plan) {
    return (
      <div className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
        <Label htmlFor="plan-input">Importer un plan de cette pièce</Label>
        <input
          id="plan-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="block w-full text-sm text-[var(--text)] file:mr-3 file:rounded-[var(--radius-atelier)] file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-fg)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p role="status" aria-live="polite" className="text-sm text-[var(--text-muted)]">
          {STEP_MESSAGES[step]}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Plan de référence</p>
        {plan.calibration ? (
          <span className="text-xs text-[var(--success)]">
            Calibré — {plan.calibration.cmPerPixel.toFixed(2)} cm/px
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Non calibré</span>
        )}
      </div>

      <div className="relative inline-block max-w-full">
        <img
          ref={imgRef}
          src={plan.readUrl}
          alt="Plan importé, à calibrer en cliquant deux points de repère"
          onClick={handleImageClick}
          className="max-h-96 max-w-full cursor-crosshair rounded-[var(--radius-atelier)] border border-[var(--border)]"
        />
        {points.map((p, i) => {
          const img = imgRef.current;
          if (!img || !img.naturalWidth) return null;
          const leftPct = (p.x / img.naturalWidth) * 100;
          const topPct = (p.y / img.naturalHeight) * 100;
          return (
            <span
              key={i}
              aria-hidden="true"
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--accent)]"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            />
          );
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Cliquez deux points du plan dont vous connaissez la distance réelle (ex. les deux
        extrémités d'un mur), puis indiquez cette distance en cm.
      </p>

      <form
        onSubmit={(e) => void handleCalibrate(e)}
        className="flex flex-wrap items-end gap-2"
      >
        <div>
          <Label htmlFor="ref-length">Distance réelle entre les deux points (cm)</Label>
          <Input
            id="ref-length"
            type="number"
            min={1}
            step="0.1"
            value={refLengthCm}
            onChange={(e) => setRefLengthCm(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={points.length !== 2 || calibrating}>
          {calibrating ? "Calibrage…" : "Calibrer"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
