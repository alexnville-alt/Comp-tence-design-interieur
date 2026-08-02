import { prisma } from "@atelier/db";
import type { Calibration, JournalKind } from "@atelier/domain";
import { createReadUrl } from "@/lib/storage/s3";

/**
 * Lecture des pièces jointes de projet (docs/05 M10). Toujours filtré par
 * `userId` via `project.userId` — jamais par le seul identifiant de la
 * ressource — et l'URL de lecture est toujours re-présignée à la demande,
 * jamais stockée (ADR-0008).
 */

export interface ProjectAssetView {
  id: string;
  kind: "ROOM_PHOTO" | "FLOOR_PLAN";
  readUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  roomId: string | null;
  calibration: Calibration | null;
  createdAt: Date;
}

async function toView(entry: {
  id: string;
  roomId: string | null;
  caption: string | null;
  calibration: unknown;
  createdAt: Date;
  asset: {
    kind: "ROOM_PHOTO" | "FLOOR_PLAN";
    storageKey: string;
    width: number | null;
    height: number | null;
  };
}): Promise<ProjectAssetView> {
  return {
    id: entry.id,
    kind: entry.asset.kind,
    readUrl: await createReadUrl(entry.asset.storageKey),
    width: entry.asset.width,
    height: entry.asset.height,
    caption: entry.caption,
    roomId: entry.roomId,
    calibration: (entry.calibration as Calibration | null) ?? null,
    createdAt: entry.createdAt,
  };
}

/** Photos d'une pièce (galerie + notes, PROJ-03) — jamais les plans, qui ont leur propre lecture. */
export async function getRoomPhotos(
  userId: string,
  roomId: string,
): Promise<ProjectAssetView[]> {
  const entries = await prisma.projectAsset.findMany({
    where: { roomId, project: { userId }, asset: { kind: "ROOM_PHOTO" } },
    include: {
      asset: { select: { kind: true, storageKey: true, width: true, height: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(entries.map(toView));
}

/** Le plan de référence d'une pièce, s'il en existe un (le plus récent). */
export async function getRoomPlan(
  userId: string,
  roomId: string,
): Promise<ProjectAssetView | null> {
  const entry = await prisma.projectAsset.findFirst({
    where: { roomId, project: { userId }, asset: { kind: "FLOOR_PLAN" } },
    include: {
      asset: { select: { kind: true, storageKey: true, width: true, height: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return entry ? toView(entry) : null;
}

/** Toutes les pièces jointes d'un projet (plans et photos), pour le dossier d'export (PROJ-08). */
export async function getProjectAssets(
  userId: string,
  projectId: string,
): Promise<ProjectAssetView[]> {
  const entries = await prisma.projectAsset.findMany({
    where: { projectId, project: { userId } },
    include: {
      asset: { select: { kind: true, storageKey: true, width: true, height: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(entries.map(toView));
}

export interface JournalEntryView {
  id: string;
  title: string;
  body: string;
  kind: JournalKind;
  createdAt: Date;
}

/** Journal de projet (PROJ-07), du plus récent au plus ancien. */
export async function getJournalEntries(
  userId: string,
  projectId: string,
): Promise<JournalEntryView[]> {
  const entries = await prisma.journalEntry.findMany({
    where: { projectId, project: { userId } },
    orderBy: { createdAt: "desc" },
  });
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    kind: e.kind,
    createdAt: e.createdAt,
  }));
}
