import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getRoomEditorData } from "@/features/studio/data";
import { getRoomPhotos } from "@/features/project-personal/data";
import { PhotoGalleryPanel } from "@/features/project-personal/photo-gallery-panel";

export const metadata: Metadata = { title: "Photos de la pièce — Atelier" };

export default async function RoomProjectPhotosPage({
  params,
}: {
  params: Promise<{ projetId: string; pieceId: string }>;
}) {
  const { projetId, pieceId } = await params;
  const user = await requireOnboardedUser();
  const data = await getRoomEditorData(user.id, projetId, pieceId);
  if (!data) notFound();

  const photos = await getRoomPhotos(user.id, pieceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${data.projectId}`}>{data.projectName}</Link> /{" "}
        <Link href={`/atelier/${data.projectId}/${data.roomId}`}>{data.roomName}</Link> /
        Photos
      </p>
      <h1 className="text-2xl">Photos — {data.roomName}</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Un carnet de photos avec notes, pour garder une trace de l'état réel de la pièce —
        distinct de l'
        <Link
          href={`/atelier/${data.projectId}/${data.roomId}/photos`}
          className="text-[var(--accent)] underline underline-offset-4"
        >
          analyse IA
        </Link>
        .
      </p>

      <PhotoGalleryPanel
        projectId={data.projectId}
        roomId={data.roomId}
        initialPhotos={photos}
      />
    </div>
  );
}
