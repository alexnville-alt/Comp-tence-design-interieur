import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectDetail } from "@/features/studio/data";
import { CreateMoodboardForm } from "@/features/generators/create-moodboard-form";
import { listMoodboards } from "@/features/generators/moodboard-data";

export const metadata: Metadata = { title: "Moodboards — Atelier" };

export default async function MoodboardsPage({
  params,
}: {
  params: Promise<{ projetId: string }>;
}) {
  const { projetId } = await params;
  const user = await requireOnboardedUser();
  const project = await getProjectDetail(user.id, projetId);
  if (!project) notFound();

  const moodboards = await listMoodboards(user.id, projetId);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="text-sm text-[var(--text-muted)]">
          <Link href="/atelier">Atelier</Link> /{" "}
          <Link href={`/atelier/${project.id}`}>{project.name}</Link> / Moodboards
        </p>
        <h1 className="text-3xl">Moodboards</h1>
      </header>

      <CreateMoodboardForm
        projectId={project.id}
        rooms={project.rooms.map((r) => ({ id: r.id, name: r.name }))}
      />

      {moodboards.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucun moodboard pour l'instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {moodboards.map((moodboard) => (
            <li key={moodboard.id}>
              <Link href={`/atelier/${project.id}/moodboards/${moodboard.id}`}>
                <Card className="transition-colors hover:border-[var(--border-strong)]">
                  <CardHeader>
                    <CardTitle>{moodboard.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[var(--text-muted)]">
                    {moodboard.itemCount} élément{moodboard.itemCount > 1 ? "s" : ""}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
