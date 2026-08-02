import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getRoomEditorData } from "@/features/studio/data";
import { getRoomPlan } from "@/features/project-personal/data";
import { PlanPanel } from "@/features/project-personal/plan-panel";

export const metadata: Metadata = { title: "Plan de référence — Atelier" };

export default async function RoomPlanPage({
  params,
}: {
  params: Promise<{ projetId: string; pieceId: string }>;
}) {
  const { projetId, pieceId } = await params;
  const user = await requireOnboardedUser();
  const data = await getRoomEditorData(user.id, projetId, pieceId);
  if (!data) notFound();

  const plan = await getRoomPlan(user.id, pieceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${data.projectId}`}>{data.projectName}</Link> /{" "}
        <Link href={`/atelier/${data.projectId}/${data.roomId}`}>{data.roomName}</Link> /
        Plan
      </p>
      <h1 className="text-2xl">Plan de référence — {data.roomName}</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Importez un plan mesuré (photo ou export d'un logiciel de plan) et calibrez-le :
        il s'affichera ensuite en repère dans l'éditeur de la pièce pour dessiner à
        l'échelle exacte.
      </p>

      <PlanPanel projectId={data.projectId} roomId={data.roomId} initialPlan={plan} />

      {plan?.calibration ? (
        <Link
          href={`/atelier/${data.projectId}/${data.roomId}`}
          className="block text-sm text-[var(--accent)] underline underline-offset-4"
        >
          Retour à l'éditeur de la pièce
        </Link>
      ) : null}
    </div>
  );
}
