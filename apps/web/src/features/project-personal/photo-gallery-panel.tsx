"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectAssetView } from "./data";
import {
  confirmProjectAssetUploadAction,
  deleteProjectAssetAction,
  requestProjectAssetUploadAction,
} from "./asset-actions";

type Step = "idle" | "uploading" | "processing" | "error";

/**
 * Galerie de photos d'une pièce, avec note (docs/05 M10, PROJ-03) —
 * distincte de l'analyse IA (`features/photos`, M6) : un simple dépôt avec
 * légende, aucun appel au fournisseur IA.
 */
export function PhotoGalleryPanel({
  projectId,
  roomId,
  initialPhotos,
}: {
  projectId: string;
  roomId: string;
  initialPhotos: ProjectAssetView[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setStep("uploading");
    try {
      const request = await requestProjectAssetUploadAction(file.type, file.size);
      if (!request.ok || !request.uploadUrl || !request.storageKey) {
        setError(
          request.error === "invalid_type"
            ? "Format non pris en charge — utilisez une image JPEG, PNG ou WebP."
            : request.error === "too_large"
              ? "Cette photo dépasse 12 Mo."
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
        kind: "ROOM_PHOTO",
        ...(caption ? { caption } : {}),
      });
      if (!confirmed.ok) {
        setError(
          confirmed.error === "invalid_image"
            ? "Ce fichier n'est pas une image valide."
            : "Le traitement de la photo a échoué. Réessayez.",
        );
        setStep("error");
        return;
      }

      setCaption("");
      setStep("idle");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setStep("error");
    }
  }

  async function handleDelete(id: string) {
    setPendingDelete(id);
    try {
      await deleteProjectAssetAction(id);
      router.refresh();
    } finally {
      setPendingDelete(null);
    }
  }

  const pending = step === "uploading" || step === "processing";

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
        <div>
          <Label htmlFor="photo-caption">Note (optionnelle)</Label>
          <Input
            id="photo-caption"
            placeholder="Ex. Prise de mesure du mur nord"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        <Label htmlFor="room-photo-input">Ajouter une photo de cette pièce</Label>
        <input
          id="room-photo-input"
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
          {step === "uploading"
            ? "Téléversement en cours…"
            : step === "processing"
              ? "Traitement de la photo…"
              : ""}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </div>

      {initialPhotos.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucune photo pour cette pièce pour l'instant.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {initialPhotos.map((photo) => (
            <li
              key={photo.id}
              className="space-y-1 overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)]"
            >
              <img
                src={photo.readUrl}
                alt={photo.caption ?? "Photo de la pièce"}
                className="aspect-square w-full object-cover"
              />
              <div className="space-y-1 p-2">
                {photo.caption ? (
                  <p className="text-xs text-[var(--text)]">{photo.caption}</p>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pendingDelete === photo.id}
                  onClick={() => void handleDelete(photo.id)}
                >
                  Retirer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
