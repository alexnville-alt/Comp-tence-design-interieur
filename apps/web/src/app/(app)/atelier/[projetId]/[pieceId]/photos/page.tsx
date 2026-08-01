import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getRoomPhotosData } from "@/features/photos/data";
import { PhotoUploadPanel } from "@/features/photos/upload-panel";

export const metadata: Metadata = { title: "Photos — Atelier" };

export default async function RoomPhotosPage({
  params,
}: {
  params: Promise<{ projetId: string; pieceId: string }>;
}) {
  const { projetId, pieceId } = await params;
  const user = await requireOnboardedUser();
  const data = await getRoomPhotosData(user.id, projetId, pieceId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${data.projectId}`}>{data.projectName}</Link> /{" "}
        <Link href={`/atelier/${data.projectId}/${data.roomId}`}>{data.roomName}</Link> /
        Photos
      </p>
      <h1 className="text-2xl">Photos — {data.roomName}</h1>

      <PhotoUploadPanel projectId={data.projectId} roomId={data.roomId} />

      {data.analyses.length > 0 ? (
        <section aria-labelledby="historique-heading" className="space-y-3">
          <h2 id="historique-heading" className="text-xl">
            Historique des analyses
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.analyses.map((analysis) => (
              <li key={analysis.id}>
                <Link
                  href={`/atelier/${data.projectId}/${data.roomId}/photos/${analysis.id}`}
                  className="block overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  <img
                    src={analysis.readUrl}
                    alt={
                      analysis.pertinente
                        ? `Analyse du ${analysis.createdAt.toLocaleDateString("fr-FR")}`
                        : `Photo non pertinente du ${analysis.createdAt.toLocaleDateString("fr-FR")}`
                    }
                    className="aspect-square w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Aucune photo analysée pour cette pièce pour l'instant.
        </p>
      )}
    </div>
  );
}
