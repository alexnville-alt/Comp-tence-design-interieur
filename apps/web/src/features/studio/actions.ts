"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@atelier/db";
import { SceneSchema, emptyScene, type Scene } from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { getRoomVersionScene } from "./data";
import { ROOM_TYPES } from "./room-types";
import { ROOM_STATUSES } from "./room-statuses";

/**
 * Mutations de l'atelier (docs/05 M4).
 *
 * Chaque action revérifie la propriété de la ressource en base — jamais
 * seulement dans la page qui l'affiche (docs/02 §6) — et valide `sceneData`
 * par `SceneSchema` avant de l'écrire : le client peut envoyer n'importe quoi,
 * jamais une scène malformée en base.
 */

export async function createProjectAction(name: string): Promise<{ id: string }> {
  const user = await requireOnboardedUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom du projet ne peut pas être vide.");

  const project = await prisma.project.create({
    data: { userId: user.id, name: trimmed },
  });
  revalidatePath("/atelier");
  return { id: project.id };
}

export async function createRoomAction(
  projectId: string,
  name: string,
  type: (typeof ROOM_TYPES)[number],
): Promise<{ id: string }> {
  const user = await requireOnboardedUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom de la pièce ne peut pas être vide.");
  if (!ROOM_TYPES.includes(type)) throw new Error("Type de pièce invalide.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Projet introuvable.");

  const room = await prisma.room.create({
    data: { projectId, name: trimmed, type },
  });
  // Une pièce démarre toujours avec une première version vide : l'atelier
  // n'a jamais à distinguer « pièce sans version » de « pièce vide ».
  await prisma.roomVersion.create({
    data: { roomId: room.id, label: "Version initiale", sceneData: emptyScene() },
  });

  revalidatePath(`/atelier/${projectId}`);
  return { id: room.id };
}

async function assertRoomOwnership(userId: string, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, project: { userId } },
    select: { id: true, projectId: true },
  });
  if (!room) throw new Error("Pièce introuvable.");
  return room;
}

/** État d'avancement d'une pièce (docs/05 M10, PROJ-05) — en base depuis M4, jamais modifiable avant ce module. */
export async function updateRoomStatusAction(
  roomId: string,
  status: (typeof ROOM_STATUSES)[number],
): Promise<void> {
  const user = await requireOnboardedUser();
  const room = await assertRoomOwnership(user.id, roomId);
  if (!ROOM_STATUSES.includes(status)) throw new Error("État invalide.");

  await prisma.room.update({ where: { id: room.id }, data: { status } });
  revalidatePath(`/atelier/${room.projectId}`);
  revalidatePath(`/atelier/${room.projectId}/${roomId}`);
}

function parseScene(sceneData: unknown): Scene {
  const parsed = SceneSchema.safeParse(sceneData);
  if (!parsed.success) {
    throw new Error("La scène envoyée est invalide : " + parsed.error.issues[0]?.message);
  }
  return parsed.data;
}

export interface SaveRoomVersionResult {
  id: string;
}

/** Enregistre l'état courant comme nouvelle version — jamais de réécriture en place (SIM-09). */
export async function saveRoomVersionAction(
  roomId: string,
  sceneData: unknown,
  label: string,
): Promise<SaveRoomVersionResult> {
  const user = await requireOnboardedUser();
  const room = await assertRoomOwnership(user.id, roomId);
  const scene = parseScene(sceneData);

  const version = await prisma.roomVersion.create({
    data: {
      roomId: room.id,
      label: label.trim() || "Nouvelle version",
      sceneData: scene,
    },
  });
  revalidatePath(`/atelier/${room.projectId}/${roomId}`);
  return { id: version.id };
}

export async function duplicateRoomVersionAction(
  roomId: string,
  versionId: string,
): Promise<SaveRoomVersionResult> {
  const user = await requireOnboardedUser();
  const room = await assertRoomOwnership(user.id, roomId);

  const source = await prisma.roomVersion.findFirst({ where: { id: versionId, roomId } });
  if (!source) throw new Error("Version introuvable.");

  const copy = await prisma.roomVersion.create({
    data: {
      roomId: room.id,
      label: `${source.label} (copie)`,
      notes: source.notes,
      sceneData: source.sceneData as Scene,
      sceneVersion: source.sceneVersion,
    },
  });
  revalidatePath(`/atelier/${room.projectId}/${roomId}`);
  return { id: copy.id };
}

export async function renameRoomVersionAction(
  roomId: string,
  versionId: string,
  label: string,
): Promise<void> {
  const user = await requireOnboardedUser();
  const room = await assertRoomOwnership(user.id, roomId);
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Le nom de la version ne peut pas être vide.");

  await prisma.roomVersion.updateMany({
    where: { id: versionId, roomId },
    data: { label: trimmed },
  });
  revalidatePath(`/atelier/${room.projectId}/${roomId}`);
}

/** « Restaurer » ajoute une nouvelle version copiant l'ancienne — l'historique reste intact. */
export async function restoreRoomVersionAction(
  roomId: string,
  versionId: string,
): Promise<SaveRoomVersionResult> {
  const user = await requireOnboardedUser();
  const room = await assertRoomOwnership(user.id, roomId);

  const source = await prisma.roomVersion.findFirst({ where: { id: versionId, roomId } });
  if (!source) throw new Error("Version introuvable.");

  const restored = await prisma.roomVersion.create({
    data: {
      roomId: room.id,
      label: `${source.label} (restaurée)`,
      sceneData: source.sceneData as Scene,
      sceneVersion: source.sceneVersion,
    },
  });
  revalidatePath(`/atelier/${room.projectId}/${roomId}`);
  return { id: restored.id };
}

/** Lecture à la demande pour le comparateur avant/après (client → serveur). */
export async function getRoomVersionSceneAction(
  versionId: string,
): Promise<Scene | null> {
  const user = await requireOnboardedUser();
  return getRoomVersionScene(user.id, versionId);
}
