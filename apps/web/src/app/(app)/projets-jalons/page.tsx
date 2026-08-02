import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { listMilestoneProjects } from "@/features/transverse/data";

export const metadata: Metadata = { title: "Projets jalons" };

export default async function ProjetsJalonsPage() {
  await requireOnboardedUser();
  const items = await listMilestoneProjects();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Projets jalons</h1>
        <p className="text-[var(--text-muted)]">
          Un projet complet à chaque fin de phase, pour mettre en pratique ce qui vient
          d'être appris sur un cas réel.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/projets-jalons/${item.slug}`}>
              <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
                <CardHeader>
                  <p className="text-xs text-[var(--text-muted)]">Phase {item.phase}</p>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
