import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getMilestoneProject } from "@/features/transverse/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getMilestoneProject(slug);
  return { title: item ? `${item.title} — Projets jalons` : "Projets jalons" };
}

export default async function MilestoneProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireOnboardedUser();
  const item = await getMilestoneProject(slug);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/projets-jalons">Projets jalons</Link> / {item.title}
      </p>

      <header className="space-y-2">
        <p className="text-xs text-[var(--text-muted)]">Phase {item.phase}</p>
        <h1 className="text-3xl">{item.title}</h1>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Le brief</h2>
        <p className="text-sm">{item.brief}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Livrables attendus</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.deliverables.map((deliverable) => (
            <li key={deliverable}>{deliverable}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Critères d'évaluation</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.evaluationCriteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
