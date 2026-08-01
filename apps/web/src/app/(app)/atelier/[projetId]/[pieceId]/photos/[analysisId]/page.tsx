import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getPhotoAnalysisDetail } from "@/features/photos/data";
import { PhotoAnalysisView } from "@/features/photos/analysis-view";

export const metadata: Metadata = { title: "Analyse photo — Atelier" };

export default async function PhotoAnalysisPage({
  params,
}: {
  params: Promise<{ projetId: string; pieceId: string; analysisId: string }>;
}) {
  const { projetId, pieceId, analysisId } = await params;
  const user = await requireOnboardedUser();
  const detail = await getPhotoAnalysisDetail(user.id, analysisId);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${projetId}`}>Projet</Link> /{" "}
        <Link href={`/atelier/${projetId}/${pieceId}/photos`}>Photos</Link> / Analyse
      </p>
      <h1 className="text-2xl">Analyse photo</h1>

      <PhotoAnalysisView
        result={detail.result}
        readUrl={detail.readUrl}
        openInAtelierHref={
          detail.roomId && detail.projectId
            ? `/atelier/${detail.projectId}/${detail.roomId}`
            : null
        }
      />
    </div>
  );
}
