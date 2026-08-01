"use server";

import { prisma, type RoomType } from "@atelier/db";
import {
  buildMoodboardGenerationSchema,
  layoutGrid,
  MoodboardTransformSchema,
  MOODBOARD_CATEGORIES,
  type MoodboardCandidate,
  type MoodboardCategory,
  type MoodboardTransform,
} from "@atelier/domain";
import { requireOnboardedUser } from "@/lib/auth";
import { aiProvider } from "@/lib/ai/provider";
import { checkAiQuota, recordAiUsage } from "@/lib/ai/usage";
import { searchLibrary, type LibrarySearchResult } from "@/features/library/data";
import { ROOM_TYPE_LABELS } from "@/features/studio/room-type-labels";
import { createReadUrl } from "@/lib/storage/s3";

/**
 * Génération de moodboard (docs/05 M8) : palette + sélection de fiches
 * bibliothèque, contrainte aux candidats réellement trouvés (jamais de fiche
 * inventée — voir `buildMoodboardGenerationSchema`, `@atelier/domain`), même
 * garde-fous quota/traçabilité que l'analyse photo (M6) et les cas ouverts
 * (M5).
 */

const CANDIDATES_PER_CATEGORY = 8;

const SYSTEM_PROMPT = `Tu es un architecte d'intérieur qui compose une planche d'inspiration (moodboard) pour Atelier, une plateforme d'apprentissage du design d'intérieur.

Propose une palette de 3 à 6 couleurs (hex), chacune avec un rôle (dominante, secondaire, accent ou neutre) et une justification — jamais de couleur sans justification.

Pour chaque catégorie fournie ci-dessous (matériaux, éclairage, accessoires, végétaux), choisis EXCLUSIVEMENT une fiche parmi les candidats listés, en la justifiant par rapport à la pièce et au style demandés. Si aucun candidat d'une catégorie ne convient vraiment, réponds null pour cette catégorie plutôt que d'inventer ou de forcer un choix médiocre.

Termine par une courte synthèse de l'ambiance recherchée.`;

async function gatherCandidates(
  roomType: RoomType | undefined,
): Promise<Partial<Record<MoodboardCategory, MoodboardCandidate[]>>> {
  const entries = await Promise.all(
    MOODBOARD_CATEGORIES.map(async (category) => {
      const results = await searchLibrary({
        category,
        ...(roomType ? { bestFor: roomType } : {}),
      });
      const candidates: MoodboardCandidate[] = results
        .slice(0, CANDIDATES_PER_CATEGORY)
        .map((r) => ({ slug: r.slug, name: r.name, summary: r.summary }));
      return [category, candidates] as const;
    }),
  );

  const byCategory: Partial<Record<MoodboardCategory, MoodboardCandidate[]>> = {};
  for (const [category, candidates] of entries) {
    if (candidates.length > 0) byCategory[category] = candidates;
  }
  return byCategory;
}

function formatCandidates(
  candidatesByCategory: Partial<Record<MoodboardCategory, MoodboardCandidate[]>>,
): string {
  const sections = MOODBOARD_CATEGORIES.map((category) => {
    const candidates = candidatesByCategory[category];
    if (!candidates) return `${category} : aucun candidat disponible, réponds null.`;
    const lines = candidates.map((c) => `  - ${c.slug} — ${c.name} : ${c.summary}`);
    return `${category} :\n${lines.join("\n")}`;
  });
  return sections.join("\n\n");
}

export interface GenerateMoodboardResult {
  ok: boolean;
  error?: "not_found" | "quota" | "provider_unavailable";
  message?: string;
  moodboardId?: string;
}

export async function generateMoodboardAction(
  projectId: string,
  title: string,
  roomId?: string,
): Promise<GenerateMoodboardResult> {
  const user = await requireOnboardedUser();

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) return { ok: false, error: "not_found" };

  let room: { id: string; type: RoomType } | null = null;
  if (roomId) {
    room = await prisma.room.findFirst({
      where: { id: roomId, projectId, project: { userId: user.id } },
      select: { id: true, type: true },
    });
    if (!room) return { ok: false, error: "not_found" };
  }

  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) {
    return {
      ok: false,
      error: "quota",
      message:
        "Le quota d'assistant IA de ce mois est atteint — réessayez le mois prochain.",
    };
  }

  const candidatesByCategory = await gatherCandidates(room?.type);
  const schema = buildMoodboardGenerationSchema(candidatesByCategory);
  const roomLabel = room ? ROOM_TYPE_LABELS[room.type] : null;

  const startedAt = Date.now();
  try {
    const result = await aiProvider.complete({
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            (roomLabel
              ? `Pièce : ${roomLabel}.\n\n`
              : "Aucune pièce précise — exploration libre.\n\n") +
            `Candidats disponibles :\n\n${formatCandidates(candidatesByCategory)}`,
        },
      ],
      schema,
      effort: "high",
    });

    await recordAiUsage({
      userId: user.id,
      feature: "GENERATOR",
      model: result.model,
      usage: result.usage,
      costEuros: result.costEuros,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    const moodboardId = await persistMoodboard({
      userId: user.id,
      projectId,
      roomId: roomId ?? null,
      title,
      candidatesByCategory,
      generation: result.data,
    });

    return { ok: true, moodboardId };
  } catch (error) {
    await recordAiUsage({
      userId: user.id,
      feature: "GENERATOR",
      model: "inconnu",
      usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
      costEuros: 0,
      durationMs: Date.now() - startedAt,
      success: false,
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    return {
      ok: false,
      error: "provider_unavailable",
      message:
        "La génération est momentanément indisponible. Réessayez dans quelques instants.",
    };
  }
}

interface PersistMoodboardInput {
  userId: string;
  projectId: string;
  roomId: string | null;
  title: string;
  candidatesByCategory: Partial<Record<MoodboardCategory, MoodboardCandidate[]>>;
  generation: {
    palette: { colors: { hex: string; role: string; justification: string }[] };
    selections: Partial<
      Record<MoodboardCategory, { slug: string; justification: string } | null>
    >;
  };
}

async function persistMoodboard(input: PersistMoodboardInput): Promise<string> {
  const paletteItems = input.generation.palette.colors.map((color) => ({
    colorHex: color.hex,
    label: `${color.role} — ${color.justification}`,
  }));

  const selectedSlugs = MOODBOARD_CATEGORIES.map(
    (c) => input.generation.selections[c],
  ).filter((s): s is { slug: string; justification: string } => Boolean(s));
  const libraryItems =
    selectedSlugs.length > 0
      ? await prisma.libraryItem.findMany({
          where: { slug: { in: selectedSlugs.map((s) => s.slug) } },
          select: { id: true, slug: true, name: true, imageAssetId: true },
        })
      : [];
  const bySlug = new Map(libraryItems.map((item) => [item.slug, item]));

  const libraryEntries = selectedSlugs.flatMap((selection) => {
    const item = bySlug.get(selection.slug);
    if (!item) return []; // sûr : slug validé par le schéma contre les candidats juste interrogés
    return [
      {
        libraryItemId: item.id,
        assetId: item.imageAssetId,
        label: `${item.name} — ${selection.justification}`,
      },
    ];
  });

  const allEntries = [...paletteItems, ...libraryEntries];
  const transforms = layoutGrid(allEntries.length);

  const moodboard = await prisma.moodboard.create({
    data: {
      projectId: input.projectId,
      roomId: input.roomId,
      title: input.title,
      items: {
        create: allEntries.map((entry, index) => ({
          ...entry,
          transform: MoodboardTransformSchema.parse(transforms[index]),
        })),
      },
    },
  });

  return moodboard.id;
}

// ── Édition libre (docs/05 M8) ──────────────────────────────────────────────

async function assertMoodboardOwnership(
  userId: string,
  moodboardId: string,
): Promise<void> {
  const moodboard = await prisma.moodboard.findFirst({
    where: { id: moodboardId, project: { userId } },
    select: { id: true },
  });
  if (!moodboard) throw new Error("Moodboard introuvable.");
}

export interface UpdateTransformResult {
  ok: boolean;
}

/** Position/taille/rotation revalidées serveur à chaque déplacement — jamais de confiance dans les coordonnées envoyées par le client. */
export async function updateMoodboardItemTransformAction(
  moodboardId: string,
  itemId: string,
  transform: unknown,
): Promise<UpdateTransformResult> {
  const user = await requireOnboardedUser();
  await assertMoodboardOwnership(user.id, moodboardId);

  const parsed = MoodboardTransformSchema.safeParse(transform);
  if (!parsed.success) return { ok: false };

  const item = await prisma.moodboardItem.findFirst({
    where: { id: itemId, moodboardId },
    select: { id: true },
  });
  if (!item) return { ok: false };

  await prisma.moodboardItem.update({
    where: { id: itemId },
    data: { transform: parsed.data },
  });
  return { ok: true };
}

/** Recherche pour l'ajout manuel d'une fiche — simple relais côté client de `searchLibrary` (M7), qui n'est utilisable que côté serveur. */
export async function searchLibraryAction(query: string): Promise<LibrarySearchResult[]> {
  await requireOnboardedUser();
  const trimmed = query.trim();
  if (!trimmed) return [];
  return searchLibrary({ query: trimmed });
}

export interface AddItemResult {
  ok: boolean;
  itemId?: string;
  imageUrl?: string | null;
  label?: string | null;
  libraryItemSlug?: string | null;
  transform?: MoodboardTransform;
}

/**
 * Ajoute manuellement une fiche bibliothèque, hors génération IA — même
 * principe de traçabilité (`libraryItemId` réel, jamais une saisie libre).
 * Renvoie déjà les champs d'affichage (URL présignée incluse) pour que
 * l'éditeur client puisse insérer l'élément sans recharger toute la page.
 */
export async function addLibraryItemToMoodboardAction(
  moodboardId: string,
  librarySlug: string,
): Promise<AddItemResult> {
  const user = await requireOnboardedUser();
  await assertMoodboardOwnership(user.id, moodboardId);

  const libraryItem = await prisma.libraryItem.findUnique({
    where: { slug: librarySlug },
    select: { id: true, name: true, imageAssetId: true },
  });
  if (!libraryItem) return { ok: false };

  // `imageAssetId` n'est pas déclaré comme relation Prisma (schema.prisma,
  // note M7) — recherche séparée de l'Asset le cas échéant.
  const asset = libraryItem.imageAssetId
    ? await prisma.asset.findUnique({
        where: { id: libraryItem.imageAssetId },
        select: { storageKey: true },
      })
    : null;

  const itemCount = await prisma.moodboardItem.count({ where: { moodboardId } });
  const [transform] = layoutGrid(itemCount + 1).slice(-1);
  const parsedTransform = MoodboardTransformSchema.parse(transform);

  const item = await prisma.moodboardItem.create({
    data: {
      moodboardId,
      libraryItemId: libraryItem.id,
      assetId: libraryItem.imageAssetId,
      label: libraryItem.name,
      transform: parsedTransform,
    },
  });
  return {
    ok: true,
    itemId: item.id,
    imageUrl: asset ? await createReadUrl(asset.storageKey) : null,
    label: libraryItem.name,
    libraryItemSlug: librarySlug,
    transform: parsedTransform,
  };
}

export async function removeMoodboardItemAction(
  moodboardId: string,
  itemId: string,
): Promise<{ ok: boolean }> {
  const user = await requireOnboardedUser();
  await assertMoodboardOwnership(user.id, moodboardId);

  const item = await prisma.moodboardItem.findFirst({
    where: { id: itemId, moodboardId },
    select: { id: true },
  });
  if (!item) return { ok: false };

  await prisma.moodboardItem.delete({ where: { id: itemId } });
  return { ok: true };
}
