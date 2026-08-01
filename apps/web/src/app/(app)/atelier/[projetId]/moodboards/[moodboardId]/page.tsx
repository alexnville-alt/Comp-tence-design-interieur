import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getMoodboardDetail } from "@/features/generators/moodboard-data";
import { MoodboardEditor } from "@/features/generators/moodboard-editor";

export const metadata: Metadata = { title: "Moodboard — Atelier" };

export default async function MoodboardDetailPage({
  params,
}: {
  params: Promise<{ projetId: string; moodboardId: string }>;
}) {
  const { projetId, moodboardId } = await params;
  const user = await requireOnboardedUser();
  const moodboard = await getMoodboardDetail(user.id, moodboardId);
  if (!moodboard || moodboard.projectId !== projetId) notFound();

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/atelier">Atelier</Link> /{" "}
        <Link href={`/atelier/${projetId}`}>Projet</Link> /{" "}
        <Link href={`/atelier/${projetId}/moodboards`}>Moodboards</Link> /{" "}
        {moodboard.title}
      </p>
      <h1 className="text-2xl">{moodboard.title}</h1>

      {moodboard.paletteContrast.length > 0 ? (
        <section aria-labelledby="contraste-heading" className="space-y-2">
          <h2 id="contraste-heading" className="text-sm font-medium">
            Contraste de la palette
          </h2>
          <ul className="space-y-1 text-sm">
            {moodboard.paletteContrast.map((check) => (
              <li
                key={`${check.colorHexA}-${check.colorHexB}`}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full border border-[var(--border)]"
                  style={{ backgroundColor: check.colorHexB }}
                />
                <span className="text-[var(--text-muted)]">
                  contre la dominante : ratio {check.ratio}:1 —{" "}
                  {check.meetsAAA ? "AAA" : check.meetsAA ? "AA" : "sous le seuil AA"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MoodboardEditor
        moodboardId={moodboard.id}
        title={moodboard.title}
        initialItems={moodboard.items}
      />
    </div>
  );
}
