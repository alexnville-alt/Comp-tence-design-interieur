"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPhotoUploadAction, confirmPhotoUploadAction } from "./upload-actions";
import { analyzePhotoAction, recordPhotoAiConsentAction } from "./analysis-actions";

type Step = "idle" | "uploading" | "processing" | "analyzing" | "consent" | "error";

const STEP_MESSAGES: Record<Step, string> = {
  idle: "",
  uploading: "Téléversement en cours…",
  processing: "Vérification et préparation de l'image…",
  analyzing: "Analyse en cours — cela peut prendre quelques instants…",
  consent: "",
  error: "",
};

/**
 * Téléversement + analyse d'une photo (M6). Trois appels serveur successifs
 * (demande d'URL présignée, téléversement direct vers S3, confirmation),
 * puis l'analyse — chaque étape a son propre message d'état, pour qu'un
 * échec à mi-parcours reste compréhensible plutôt qu'un simple spinner figé.
 */
export function PhotoUploadPanel({
  projectId,
  roomId,
}: {
  projectId: string;
  roomId: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAssetId, setPendingAssetId] = React.useState<string | null>(null);

  async function runAnalysis(assetId: string) {
    setStep("analyzing");
    const analysis = await analyzePhotoAction(assetId, roomId);

    if (analysis.error === "consent_required") {
      setPendingAssetId(assetId);
      setStep("consent");
      return;
    }
    if (!analysis.ok || !analysis.analysisId) {
      setError(analysis.message ?? "L'analyse a échoué. Réessayez.");
      setStep("error");
      return;
    }

    router.push(`/atelier/${projectId}/${roomId}/photos/${analysis.analysisId}`);
  }

  async function handleFile(file: File) {
    setError(null);
    setStep("uploading");

    try {
      const request = await requestPhotoUploadAction(file.type, file.size);
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
      const confirmed = await confirmPhotoUploadAction(request.storageKey);
      if (!confirmed.ok || !confirmed.assetId) {
        setError(
          confirmed.error === "invalid_image"
            ? "Ce fichier n'est pas une image valide."
            : "Le traitement de la photo a échoué. Réessayez.",
        );
        setStep("error");
        return;
      }

      await runAnalysis(confirmed.assetId);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setStep("error");
    }
  }

  async function handleConsent() {
    if (!pendingAssetId) return;
    await recordPhotoAiConsentAction();
    await runAnalysis(pendingAssetId);
  }

  const pending =
    step === "uploading" ||
    step === "processing" ||
    step === "analyzing" ||
    step === "consent";

  if (step === "consent") {
    return (
      <div className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
        <p className="text-sm text-[var(--text)]">
          Cette photo va être envoyée à l'assistant IA pour être analysée. C'est la
          première fois que vous demandez une analyse : votre accord est nécessaire avant
          l'envoi. Voir la{" "}
          <a
            href="/politique-de-confidentialite"
            className="underline underline-offset-2"
          >
            politique de confidentialité
          </a>
          .
        </p>
        <Button onClick={() => void handleConsent()}>J'accepte et je continue</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
      <Label htmlFor="photo-input">Analyser une photo de cette pièce</Label>
      <input
        id="photo-input"
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
