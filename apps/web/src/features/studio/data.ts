import { prisma } from "@atelier/db";
import { emptyScene, SceneSchema, type Scene } from "@atelier/domain";

/**
 * Lecture des données de l'atelier (docs/05 M4). Chaque requête est filtrée
 * par `userId` — jamais uniquement par l'identifiant de la ressource — pour
 * qu'un identifiant deviné n'expose jamais le projet d'un autre utilisateur
 * (docs/02 §6, `assertOwnership`).
 */

export interface ProjectSummary {
  id: string;
  name: string;
  kind: "PERSONAL" | "EXERCISE" | "TEMPLATE";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  roomCount: number;
  createdAt: Date;
}

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rooms: true } } },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    status: p.status,
    roomCount: p._count.rooms,
    createdAt: p.createdAt,
  }));
}

export interface ProjectDetail {
  id: string;
  name: string;
  rooms: { id: string; name: string; type: string; status: string }[];
}

export async function getProjectDetail(
  userId: string,
  projectId: string,
): Promise<ProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { rooms: { orderBy: { order: "asc" } } },
  });
  if (!project) return null;
  return {
    id: project.id,
    name: project.name,
    rooms: project.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
    })),
  };
}

export interface RoomVersionSummary {
  id: string;
  label: string;
  notes: string | null;
  createdAt: Date;
}

export interface RoomEditorData {
  projectId: string;
  projectName: string;
  roomId: string;
  roomName: string;
  versions: RoomVersionSummary[];
  currentVersionId: string | null;
  currentScene: Scene;
}

/** La version courante est la plus récente — voir la note en tête de schema.prisma. */
export async function getRoomEditorData(
  userId: string,
  projectId: string,
  roomId: string,
): Promise<RoomEditorData | null> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, projectId, project: { userId } },
    include: {
      project: true,
      versions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!room) return null;

  const [latest] = room.versions;
  const parsed = latest ? SceneSchema.safeParse(latest.sceneData) : null;

  return {
    projectId: room.project.id,
    projectName: room.project.name,
    roomId: room.id,
    roomName: room.name,
    versions: room.versions.map((v) => ({
      id: v.id,
      label: v.label,
      notes: v.notes,
      createdAt: v.createdAt,
    })),
    currentVersionId: latest?.id ?? null,
    currentScene: parsed?.success ? parsed.data : emptyScene(),
  };
}

export async function getRoomVersionScene(
  userId: string,
  versionId: string,
): Promise<Scene | null> {
  const version = await prisma.roomVersion.findFirst({
    where: { id: versionId, room: { project: { userId } } },
  });
  if (!version) return null;
  const parsed = SceneSchema.safeParse(version.sceneData);
  return parsed.success ? parsed.data : null;
}
