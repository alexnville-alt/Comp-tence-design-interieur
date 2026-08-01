import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRoomForm } from "@/features/studio/create-room-form";
import { getProjectDetail } from "@/features/studio/data";
import { ROOM_TYPE_LABELS } from "@/features/studio/room-type-labels";

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

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="text-sm text-[var(--text-muted)]">
          <Link href="/atelier">Atelier</Link> / {project.name}
        </p>
        <h1 className="text-3xl">{project.name}</h1>
      </header>

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
                    <CardTitle>{room.name}</CardTitle>
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
    </div>
  );
}
