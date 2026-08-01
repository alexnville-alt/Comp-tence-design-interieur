import { prisma } from "@atelier/db";
import {
  buildFurnitureList,
  SceneSchema,
  type DimensionedFurnitureEntry,
} from "@atelier/domain";

/**
 * Liste de mobilier dimensionnée d'une pièce (docs/05 M8) — lit la scène
 * courante (`RoomVersion` la plus récente, M4) et résout `librarySlugs`
 * contre `LibraryItem` réel avant d'appeler la fonction pure `@atelier/domain`
 * (ADR-0009 : la résolution DB reste ici, jamais dans `packages/domain`).
 */

export interface RoomFurnitureList {
  projectId: string;
  projectName: string;
  roomId: string;
  roomName: string;
  entries: DimensionedFurnitureEntry[];
}

export async function getRoomFurnitureList(
  userId: string,
  projectId: string,
  roomId: string,
): Promise<RoomFurnitureList | null> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, projectId, project: { userId } },
    include: {
      project: true,
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!room) return null;

  const [latest] = room.versions;
  const parsed = latest ? SceneSchema.safeParse(latest.sceneData) : null;
  const furniture = parsed?.success ? parsed.data.furniture : [];

  const catalogRefs = [
    ...new Set(furniture.map((f) => f.catalogRef).filter((r): r is string => Boolean(r))),
  ];
  const libraryItems =
    catalogRefs.length > 0
      ? await prisma.libraryItem.findMany({
          where: { slug: { in: catalogRefs } },
          select: { slug: true },
        })
      : [];
  const librarySlugs = new Set(libraryItems.map((item) => item.slug));

  return {
    projectId: room.project.id,
    projectName: room.project.name,
    roomId: room.id,
    roomName: room.name,
    entries: buildFurnitureList(furniture, librarySlugs),
  };
}
