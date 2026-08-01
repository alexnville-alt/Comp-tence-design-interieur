import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getRoomEditorData } from "@/features/studio/data";
import { StudioEditor } from "@/features/studio/studio-editor";

export const metadata: Metadata = { title: "Pièce — Atelier" };

export default async function RoomEditorPage({
  params,
}: {
  params: Promise<{ projetId: string; pieceId: string }>;
}) {
  const { projetId, pieceId } = await params;
  const user = await requireOnboardedUser();
  const data = await getRoomEditorData(user.id, projetId, pieceId);
  if (!data) notFound();

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${data.projectId}`}>{data.projectName}</Link> /{" "}
        {data.roomName}
      </p>
      <h1 className="text-2xl">{data.roomName}</h1>

      <StudioEditor
        roomId={data.roomId}
        initialScene={data.currentScene}
        initialVersions={data.versions}
        initialCurrentVersionId={data.currentVersionId}
      />
    </div>
  );
}
