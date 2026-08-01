import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectForm } from "@/features/studio/create-project-form";
import { listProjects } from "@/features/studio/data";

export const metadata: Metadata = { title: "Atelier" };

export default async function AtelierPage() {
  const user = await requireOnboardedUser();
  const projects = await listProjects(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Atelier</h1>
        <p className="text-[var(--text-muted)]">
          Dessinez vos pièces en plan, posez du mobilier, suivez la circulation en temps
          réel.
        </p>
      </header>

      <CreateProjectForm />

      {projects.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Aucun projet pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/atelier/${project.id}`}>
                <Card className="transition-colors hover:border-[var(--border-strong)]">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[var(--text-muted)]">
                    {project.roomCount} pièce{project.roomCount > 1 ? "s" : ""}
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
