import { prisma } from "@atelier/db";
import { AnalysePhotoSchema, type AnalysePhoto } from "@atelier/domain";
import { createReadUrl } from "@/lib/storage/s3";

/**
 * Lecture des données de photos et analyses (M6). Même discipline que
 * `features/studio/data.ts` : chaque requête filtre par `userId` directement
 * dans la clause `where`, jamais après coup (docs/02 §6).
 */

export interface RoomPhotosData {
  projectId: string;
  projectName: string;
  roomId: string;
  roomName: string;
  analyses: {
    id: string;
    assetId: string;
    createdAt: Date;
    readUrl: string;
    pertinente: boolean;
  }[];
}

export async function getRoomPhotosData(
  userId: string,
  projectId: string,
  roomId: string,
): Promise<RoomPhotosData | null> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, projectId, project: { userId } },
    include: { project: true },
  });
  if (!room) return null;

  const analyses = await prisma.photoAnalysis.findMany({
    where: { roomId, asset: { userId } },
    include: { asset: true },
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    analyses.map(async (analysis) => {
      const parsed = AnalysePhotoSchema.safeParse(analysis.result);
      return {
        id: analysis.id,
        assetId: analysis.assetId,
        createdAt: analysis.createdAt,
        readUrl: await createReadUrl(analysis.asset.storageKey),
        pertinente: parsed.success ? parsed.data.pertinente : false,
      };
    }),
  );

  return {
    projectId: room.project.id,
    projectName: room.project.name,
    roomId: room.id,
    roomName: room.name,
    analyses: withUrls,
  };
}

export interface PhotoAnalysisDetail {
  id: string;
  roomId: string | null;
  projectId: string;
  readUrl: string;
  result: AnalysePhoto;
  createdAt: Date;
}

export async function getPhotoAnalysisDetail(
  userId: string,
  analysisId: string,
): Promise<PhotoAnalysisDetail | null> {
  const analysis = await prisma.photoAnalysis.findFirst({
    where: { id: analysisId, asset: { userId } },
    include: { asset: true },
  });
  if (!analysis) return null;

  const parsed = AnalysePhotoSchema.safeParse(analysis.result);
  if (!parsed.success) return null;

  // La pièce peut avoir été supprimée depuis dans l'atelier (`roomId` est une
  // référence souple, docs/04 §3.7) : on ne peut alors pas offrir la
  // passerelle « ouvrir dans l'atelier ».
  const room = analysis.roomId
    ? await prisma.room.findFirst({
        where: { id: analysis.roomId, project: { userId } },
        select: { projectId: true },
      })
    : null;

  return {
    id: analysis.id,
    roomId: analysis.roomId,
    projectId: room?.projectId ?? "",
    readUrl: await createReadUrl(analysis.asset.storageKey),
    result: parsed.data,
    createdAt: analysis.createdAt,
  };
}
