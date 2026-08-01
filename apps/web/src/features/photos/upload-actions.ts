"use server";

import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";
import { buildPhotoStorageKey } from "@/lib/storage/keys";
import { createUploadUrl, getObjectBytes, putObjectBytes } from "@/lib/storage/s3";
import {
  InvalidImageError,
  MAX_UPLOAD_BYTES,
  processUploadedImage,
} from "@/lib/storage/image";

/**
 * Téléversement de photo en deux temps (ADR-0008) : le serveur ne relaie
 * jamais les octets. `requestPhotoUploadAction` vérifie session, type et
 * taille puis émet une URL présignée ; le client dépose directement sur S3 ;
 * `confirmPhotoUploadAction` télécharge côté serveur pour vérifier les
 * magic bytes, retirer l'EXIF, redimensionner, puis crée `Asset`.
 */

const ALLOWED_UPLOAD_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface RequestUploadResult {
  ok: boolean;
  error?: "invalid_type" | "too_large";
  uploadUrl?: string;
  storageKey?: string;
}

export async function requestPhotoUploadAction(
  mimeType: string,
  bytes: number,
): Promise<RequestUploadResult> {
  const user = await requireOnboardedUser();

  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType)) {
    return { ok: false, error: "invalid_type" };
  }
  if (bytes <= 0 || bytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const storageKey = buildPhotoStorageKey(user.id);
  const uploadUrl = await createUploadUrl(storageKey, mimeType);

  return { ok: true, uploadUrl, storageKey };
}

export interface ConfirmUploadResult {
  ok: boolean;
  error?: "not_found" | "invalid_image" | "too_large";
  assetId?: string;
  width?: number;
  height?: number;
}

export async function confirmPhotoUploadAction(
  storageKey: string,
): Promise<ConfirmUploadResult> {
  const user = await requireOnboardedUser();

  // Ne fait confiance qu'à une clé que nous avons nous-mêmes générée pour
  // cet utilisateur (`requestPhotoUploadAction`) — jamais une clé arbitraire
  // fournie par le client.
  if (!storageKey.startsWith(`photos/${user.id}/`)) {
    return { ok: false, error: "not_found" };
  }

  let rawBytes: Buffer;
  try {
    rawBytes = await getObjectBytes(storageKey);
  } catch {
    return { ok: false, error: "not_found" };
  }

  if (rawBytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "too_large" };
  }

  let processed;
  try {
    processed = await processUploadedImage(rawBytes);
  } catch (error) {
    if (error instanceof InvalidImageError) {
      return { ok: false, error: "invalid_image" };
    }
    throw error;
  }

  // Réécrit à la même clé (ADR-0008, étape 6) : jamais les octets bruts du
  // client conservés durablement, seulement la version traitée (EXIF retiré,
  // redimensionnée).
  await putObjectBytes(storageKey, processed.bytes, processed.mimeType);

  const asset = await prisma.asset.upsert({
    where: { storageKey },
    update: {
      mimeType: processed.mimeType,
      bytes: processed.bytes.length,
      width: processed.width,
      height: processed.height,
      sha256: processed.sha256,
    },
    create: {
      userId: user.id,
      kind: "ROOM_PHOTO",
      storageKey,
      mimeType: processed.mimeType,
      bytes: processed.bytes.length,
      width: processed.width,
      height: processed.height,
      sha256: processed.sha256,
    },
  });

  return {
    ok: true,
    assetId: asset.id,
    width: processed.width,
    height: processed.height,
  };
}
