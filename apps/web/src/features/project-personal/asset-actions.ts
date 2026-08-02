"use server";

import { revalidatePath } from "next/cache";
import { prisma, type AssetKind } from "@atelier/db";
import { computeCalibration, CalibrationPointSchema } from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { buildProjectAssetStorageKey } from "@/lib/storage/keys";
import { createUploadUrl, getObjectBytes, putObjectBytes } from "@/lib/storage/s3";
import {
  InvalidImageError,
  MAX_UPLOAD_BYTES,
  processUploadedImage,
} from "@/lib/storage/image";

/**
 * Pièces jointes de projet (docs/05 M10, PROJ-02/03) : plans importés
 * (calibrés) et photos par pièce — même flux de dépôt en deux temps que
 * `photos/upload-actions.ts` (M6, ADR-0008), généralisé aux deux usages
 * puisqu'aucun n'implique d'appel IA (à la différence de `PhotoAnalysis`).
 *
 * L'import est volontairement limité aux images (JPEG/PNG/WebP) : aucun
 * rendu PDF fiable et sans dépendance native n'est disponible dans cet
 * environnement (voir la note en tête de `schema.prisma`, M10) — un plan en
 * PDF doit être exporté en image avant import.
 */

const ALLOWED_UPLOAD_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface RequestUploadResult {
  ok: boolean;
  error?: "invalid_type" | "too_large";
  uploadUrl?: string;
  storageKey?: string;
}

export async function requestProjectAssetUploadAction(
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

  const storageKey = buildProjectAssetStorageKey(user.id);
  const uploadUrl = await createUploadUrl(storageKey, mimeType);
  return { ok: true, uploadUrl, storageKey };
}

export interface ConfirmUploadResult {
  ok: boolean;
  error?: "not_found" | "invalid_image" | "too_large";
  projectAssetId?: string;
  width?: number;
  height?: number;
}

export async function confirmProjectAssetUploadAction(input: {
  storageKey: string;
  projectId: string;
  kind: Extract<AssetKind, "ROOM_PHOTO" | "FLOOR_PLAN">;
  roomId?: string;
  caption?: string;
}): Promise<ConfirmUploadResult> {
  const user = await requireOnboardedUser();

  if (!input.storageKey.startsWith(`project-assets/${user.id}/`)) {
    return { ok: false, error: "not_found" };
  }

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "not_found" };

  if (input.roomId) {
    const room = await prisma.room.findFirst({
      where: { id: input.roomId, projectId: input.projectId },
      select: { id: true },
    });
    if (!room) return { ok: false, error: "not_found" };
  }

  let rawBytes: Buffer;
  try {
    rawBytes = await getObjectBytes(input.storageKey);
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
    if (error instanceof InvalidImageError) return { ok: false, error: "invalid_image" };
    throw error;
  }

  await putObjectBytes(input.storageKey, processed.bytes, processed.mimeType);

  const asset = await prisma.asset.create({
    data: {
      userId: user.id,
      kind: input.kind,
      storageKey: input.storageKey,
      mimeType: processed.mimeType,
      bytes: processed.bytes.length,
      width: processed.width,
      height: processed.height,
      sha256: processed.sha256,
    },
  });

  const projectAsset = await prisma.projectAsset.create({
    data: {
      projectId: input.projectId,
      assetId: asset.id,
      roomId: input.roomId ?? null,
      caption: input.caption?.trim() || null,
    },
  });

  revalidatePath(`/atelier/${input.projectId}`);
  if (input.roomId) revalidatePath(`/atelier/${input.projectId}/${input.roomId}`);

  return {
    ok: true,
    projectAssetId: projectAsset.id,
    width: processed.width,
    height: processed.height,
  };
}

export interface CalibrateResult {
  ok: boolean;
  error?: "not_found" | "invalid";
}

/**
 * Calibre un plan déjà importé : deux points de référence (repère de l'image
 * traitée, jamais l'original brut — voir `processUploadedImage`) et la
 * distance réelle qu'ils représentent. Revalide tout côté serveur : un point
 * hors des dimensions de l'image stockée est refusé plutôt qu'accepté
 * silencieusement (PROJ-02, précision ±2 %).
 */
export async function calibrateProjectAssetAction(
  projectAssetId: string,
  refPointA: unknown,
  refPointB: unknown,
  refLengthCm: number,
): Promise<CalibrateResult> {
  const user = await requireOnboardedUser();

  const projectAsset = await prisma.projectAsset.findFirst({
    where: { id: projectAssetId, project: { userId: user.id } },
    include: { asset: { select: { kind: true, width: true, height: true } } },
  });
  if (!projectAsset) return { ok: false, error: "not_found" };
  if (projectAsset.asset.kind !== "FLOOR_PLAN") return { ok: false, error: "invalid" };

  const parsedA = CalibrationPointSchema.safeParse(refPointA);
  const parsedB = CalibrationPointSchema.safeParse(refPointB);
  if (!parsedA.success || !parsedB.success || !(refLengthCm > 0)) {
    return { ok: false, error: "invalid" };
  }

  const { width, height } = projectAsset.asset;
  const withinBounds = (p: { x: number; y: number }) =>
    p.x >= 0 && p.y >= 0 && (!width || p.x <= width) && (!height || p.y <= height);
  if (!withinBounds(parsedA.data) || !withinBounds(parsedB.data)) {
    return { ok: false, error: "invalid" };
  }

  let calibration;
  try {
    calibration = computeCalibration(parsedA.data, parsedB.data, refLengthCm);
  } catch {
    return { ok: false, error: "invalid" };
  }

  await prisma.projectAsset.update({
    where: { id: projectAssetId },
    data: { calibration },
  });

  revalidatePath(`/atelier/${projectAsset.projectId}`);
  if (projectAsset.roomId) {
    revalidatePath(`/atelier/${projectAsset.projectId}/${projectAsset.roomId}`);
  }

  return { ok: true };
}

export async function deleteProjectAssetAction(projectAssetId: string): Promise<void> {
  const user = await requireOnboardedUser();
  const projectAsset = await prisma.projectAsset.findFirst({
    where: { id: projectAssetId, project: { userId: user.id } },
    select: { id: true, projectId: true, roomId: true },
  });
  if (!projectAsset) throw new Error("Pièce jointe introuvable.");

  await prisma.projectAsset.delete({ where: { id: projectAssetId } });
  revalidatePath(`/atelier/${projectAsset.projectId}`);
  if (projectAsset.roomId) {
    revalidatePath(`/atelier/${projectAsset.projectId}/${projectAsset.roomId}`);
  }
}
