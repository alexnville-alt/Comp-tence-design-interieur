import { prisma } from "@atelier/db";
import {
  computeContrastChecks,
  MoodboardTransformSchema,
  PALETTE_ROLES,
  type ContrastCheck,
  type MoodboardTransform,
  type PaletteColor,
} from "@atelier/domain";
import { createReadUrl } from "@/lib/storage/s3";

/**
 * Lecture des moodboards (docs/05 M8) — même principe d'autorisation que le
 * reste de l'application : toujours filtré par `userId`, jamais par le seul
 * identifiant de la ressource (docs/02 §6).
 */

export interface MoodboardSummary {
  id: string;
  title: string;
  roomId: string | null;
  itemCount: number;
  createdAt: Date;
}

export async function listMoodboards(
  userId: string,
  projectId: string,
): Promise<MoodboardSummary[]> {
  const moodboards = await prisma.moodboard.findMany({
    where: { projectId, project: { userId } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return moodboards.map((m) => ({
    id: m.id,
    title: m.title,
    roomId: m.roomId,
    itemCount: m._count.items,
    createdAt: m.createdAt,
  }));
}

export interface MoodboardItemView {
  id: string;
  libraryItemSlug: string | null;
  /** Toujours re-présignée, jamais une URL stockée (ADR-0008). */
  imageUrl: string | null;
  colorHex: string | null;
  label: string | null;
  transform: MoodboardTransform;
}

export interface MoodboardDetail {
  id: string;
  projectId: string;
  title: string;
  roomId: string | null;
  items: MoodboardItemView[];
  /** Recalculé côté serveur à chaque lecture, jamais stocké — voir `computeContrastChecks` (`@atelier/domain`). */
  paletteContrast: ContrastCheck[];
}

/**
 * `MoodboardItem` ne porte pas de champ « rôle » dédié pour les couleurs de
 * palette — `persistMoodboard` (`moodboard-actions.ts`) encode
 * `"<rôle> — <justification>"` dans `label` plutôt que d'ajouter une colonne
 * pour un unique cas d'usage (M8). On la décode ici, au seul endroit qui en
 * a besoin.
 */
function parsePaletteColor(item: {
  colorHex: string | null;
  label: string | null;
}): PaletteColor | null {
  if (!item.colorHex || !item.label) return null;
  const separatorIndex = item.label.indexOf(" — ");
  if (separatorIndex === -1) return null;
  const rolePart = item.label.slice(0, separatorIndex);
  const role = PALETTE_ROLES.find((r) => r === rolePart);
  if (!role) return null;
  return {
    hex: item.colorHex,
    role,
    justification: item.label.slice(separatorIndex + " — ".length),
  };
}

export async function getMoodboardDetail(
  userId: string,
  moodboardId: string,
): Promise<MoodboardDetail | null> {
  const moodboard = await prisma.moodboard.findFirst({
    where: { id: moodboardId, project: { userId } },
    include: { items: { include: { libraryItem: true, asset: true } } },
  });
  if (!moodboard) return null;

  const items = await Promise.all(
    moodboard.items.map(async (item) => {
      const parsedTransform = MoodboardTransformSchema.safeParse(item.transform);
      return {
        id: item.id,
        libraryItemSlug: item.libraryItem?.slug ?? null,
        imageUrl: item.asset ? await createReadUrl(item.asset.storageKey) : null,
        colorHex: item.colorHex,
        label: item.label,
        transform: parsedTransform.success
          ? parsedTransform.data
          : { x: 0, y: 0, w: 220, h: 220, z: 0, rotation: 0 },
      };
    }),
  );

  const paletteColors = moodboard.items
    .map((item) => parsePaletteColor({ colorHex: item.colorHex, label: item.label }))
    .filter((c): c is PaletteColor => c !== null);

  return {
    id: moodboard.id,
    projectId: moodboard.projectId,
    title: moodboard.title,
    roomId: moodboard.roomId,
    items,
    paletteContrast: computeContrastChecks(paletteColors),
  };
}
