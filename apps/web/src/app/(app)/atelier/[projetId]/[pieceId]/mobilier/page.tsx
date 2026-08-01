import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getRoomFurnitureList } from "@/features/generators/furniture-list-data";

export const metadata: Metadata = { title: "Mobilier — Atelier" };

export default async function RoomFurniturePage({
  params,
}: {
  params: Promise<{ projetId: string; pieceId: string }>;
}) {
  const { projetId, pieceId } = await params;
  const user = await requireOnboardedUser();
  const data = await getRoomFurnitureList(user.id, projetId, pieceId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${data.projectId}`}>{data.projectName}</Link> /{" "}
        <Link href={`/atelier/${data.projectId}/${data.roomId}`}>{data.roomName}</Link> /
        Mobilier
      </p>
      <h1 className="text-2xl">Liste de mobilier — {data.roomName}</h1>

      {data.entries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucun meuble placé dans cette pièce pour l'instant.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-atelier)] border border-[var(--border)]">
          {data.entries.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-[var(--text)]">
                  {entry.label}
                  {entry.quantity > 1 ? ` × ${entry.quantity}` : ""}
                </p>
                <p className="text-[var(--text-muted)]">
                  {entry.footprint.w} × {entry.footprint.d} × {entry.footprint.h} cm
                </p>
              </div>
              {entry.linkedToLibrary && entry.catalogRef ? (
                <Link
                  href={`/bibliotheque/${entry.catalogRef}`}
                  className="shrink-0 text-[var(--accent)] underline underline-offset-4"
                >
                  Voir la fiche
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
