import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRoomForm } from "@/features/studio/create-room-form";
import { getProjectDetail } from "@/features/studio/data";
import { ROOM_TYPE_LABELS } from "@/features/studio/room-type-labels";
import { ROOM_STATUS_LABELS } from "@/features/studio/room-status-labels";
import { getJournalEntries } from "@/features/project-personal/data";
import { JournalPanel } from "@/features/project-personal/journal-panel";
import { ProjectSettingsForm } from "@/features/project-personal/project-settings-form";
import { ChatPanel } from "@/features/ai/chat-panel";

export const metadata: Metadata = { title: "Projet — Atelier" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projetId: string }>;
}) {
  const { projetId } = await params;
  const user = await requireOnboardedUser();
  const project = await getProjectDetail(user.id, projetId);
  if (!project) notFound();

  const journalEntries = await getJournalEntries(user.id, projetId);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="text-sm text-[var(--text-muted)]">
          <Link href="/atelier">Atelier</Link> / {project.name}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl">{project.name}</h1>
          <div className="flex items-center gap-4">
            <Link
              href={`/atelier/${project.id}/moodboards`}
              className="text-sm text-[var(--accent)] underline underline-offset-4"
            >
              Moodboards
            </Link>
            <a
              href={`/api/atelier/${project.id}/dossier`}
              className="text-sm text-[var(--accent)] underline underline-offset-4"
            >
              Télécharger le dossier PDF
            </a>
          </div>
        </div>
      </header>

      <ProjectSettingsForm
        projectId={project.id}
        initialAddress={project.address}
        initialBudgetCents={project.budgetCents}
      />

      <CreateRoomForm projectId={project.id} />

      {project.rooms.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Aucune pièce pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {project.rooms.map((room) => (
            <li key={room.id}>
              <Link href={`/atelier/${project.id}/${room.id}`}>
                <Card className="transition-colors hover:border-[var(--border-strong)]">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      {room.name}
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs font-normal text-[var(--text-muted)]">
                        {ROOM_STATUS_LABELS[
                          room.status as keyof typeof ROOM_STATUS_LABELS
                        ] ?? room.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[var(--text-muted)]">
                    {ROOM_TYPE_LABELS[room.type as keyof typeof ROOM_TYPE_LABELS] ??
                      room.type}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-xl">Journal de projet</h2>
        <JournalPanel projectId={project.id} initialEntries={journalEntries} />
      </section>

      <ChatPanel
        projectId={project.id}
        summary="Architecte accompagnateur — poser une question sur ce projet"
        disclaimer="L'architecte accompagnateur conseille et se souvient du journal de ce projet, mais ne remplace jamais un professionnel du bâtiment. Pour un mur porteur, l'électricité, le gaz, l'amiante ou le plomb, il vous renverra vers un professionnel qualifié plutôt que de répondre."
      />
    </div>
  );
}
