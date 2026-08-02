import { prisma } from "@atelier/db";
import {
  buildFurnitureList,
  MoodboardTransformSchema,
  SceneSchema,
} from "@atelier/domain";
import { getObjectBytes } from "@/lib/storage/s3";
import type { DossierData, DossierMoodboard, DossierRoom } from "./dossier";

/**
 * Rassemble les données du dossier PDF (docs/05 M10, PROJ-08) : toujours
 * filtré par `userId`, jamais par le seul identifiant du projet (docs/02
 * §6). Les octets d'image sont téléchargés ici (jamais dans `dossier.ts`,
 * qui reste une fonction pure de composition) — voir la note en tête de ce
 * fichier voisin.
 */
export async function getProjectDossierData(
  userId: string,
  projectId: string,
): Promise<DossierData | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      name: true,
      address: true,
      budgetCents: true,
      rooms: {
        orderBy: { order: "asc" },
        include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
      assets: { include: { asset: true } },
      moodboards: { include: { items: { include: { asset: true } } } },
      journal: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;

  const roomScenes = project.rooms.map((room) => {
    const [latest] = room.versions;
    const parsed = latest ? SceneSchema.safeParse(latest.sceneData) : null;
    return { room, furniture: parsed?.success ? parsed.data.furniture : [] };
  });

  const catalogRefs = [
    ...new Set(
      roomScenes.flatMap(({ furniture }) =>
        furniture.map((f) => f.catalogRef).filter((r): r is string => Boolean(r)),
      ),
    ),
  ];
  const libraryItems =
    catalogRefs.length > 0
      ? await prisma.libraryItem.findMany({
          where: { slug: { in: catalogRefs } },
          select: { slug: true },
        })
      : [];
  const librarySlugs = new Set(libraryItems.map((item) => item.slug));

  const assetsByRoom = new Map<string, typeof project.assets>();
  for (const projectAsset of project.assets) {
    if (!projectAsset.roomId) continue;
    const list = assetsByRoom.get(projectAsset.roomId) ?? [];
    list.push(projectAsset);
    assetsByRoom.set(projectAsset.roomId, list);
  }

  const rooms: DossierRoom[] = await Promise.all(
    roomScenes.map(async ({ room, furniture }) => {
      const roomAssets = assetsByRoom.get(room.id) ?? [];
      const plan = roomAssets.find((a) => a.asset.kind === "FLOOR_PLAN");
      const photos = roomAssets.filter((a) => a.asset.kind === "ROOM_PHOTO");

      const [planJpegBytes, photoEntries] = await Promise.all([
        plan ? getObjectBytes(plan.asset.storageKey) : Promise.resolve(null),
        Promise.all(
          photos.map(async (photo) => ({
            caption: photo.caption,
            jpegBytes: await getObjectBytes(photo.asset.storageKey),
          })),
        ),
      ]);

      return {
        name: room.name,
        type: room.type,
        status: room.status,
        planJpegBytes,
        photos: photoEntries,
        furniture: buildFurnitureList(furniture, librarySlugs),
      };
    }),
  );

  const moodboards: DossierMoodboard[] = await Promise.all(
    project.moodboards.map(async (moodboard) => ({
      title: moodboard.title,
      items: await Promise.all(
        moodboard.items.map(async (item) => {
          const parsedTransform = MoodboardTransformSchema.safeParse(item.transform);
          return {
            label: item.label,
            colorHex: item.colorHex,
            jpegBytes: item.asset ? await getObjectBytes(item.asset.storageKey) : null,
            transform: parsedTransform.success
              ? parsedTransform.data
              : { x: 0, y: 0, w: 220, h: 220, z: 0, rotation: 0 },
          };
        }),
      ),
    })),
  );

  return {
    projectName: project.name,
    address: project.address,
    budgetCents: project.budgetCents,
    rooms,
    moodboards,
    journalEntries: project.journal.map((entry) => ({
      title: entry.title,
      kind: entry.kind,
      body: entry.body,
      createdAt: entry.createdAt,
    })),
  };
}
