import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { getFamousInterior } from "@/features/transverse/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getFamousInterior(slug);
  return { title: item ? `${item.name} — Intérieurs célèbres` : "Intérieurs célèbres" };
}

export default async function FamousInteriorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireOnboardedUser();
  const item = await getFamousInterior(slug);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/interieurs-celebres">Intérieurs célèbres</Link> / {item.name}
      </p>

      <header className="space-y-2">
        <p className="text-xs text-[var(--text-muted)]">
          {item.architect} — {item.year} — {item.location}
        </p>
        <h1 className="text-3xl">{item.name}</h1>
        {item.externalLink ? (
          <a
            href={item.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] underline underline-offset-2"
          >
            Voir des photos et en savoir plus
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(ouvre un site externe dans un nouvel onglet)</span>
          </a>
        ) : null}
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Contexte</h2>
        <p className="text-sm">{item.context}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Intention de conception</h2>
        <p className="text-sm">{item.designIntent}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Lumière</h2>
        <p className="text-sm">{item.light}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Matières</h2>
        <p className="text-sm">{item.materials}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Circulation</h2>
        <p className="text-sm">{item.circulation}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">À retenir</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.takeaways.map((takeaway) => (
            <li key={takeaway}>{takeaway}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
