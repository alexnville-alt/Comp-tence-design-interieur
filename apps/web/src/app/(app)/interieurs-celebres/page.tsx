import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { listFamousInteriors } from "@/features/transverse/data";

export const metadata: Metadata = { title: "Intérieurs célèbres" };

export default async function InterieursCelebresPage() {
  await requireOnboardedUser();
  const items = await listFamousInteriors();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Intérieurs célèbres</h1>
        <p className="text-[var(--text-muted)]">
          Des études de cas d'intérieurs marquants de l'histoire de l'architecture, pour
          apprendre à lire une intention de conception.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/interieurs-celebres/${item.slug}`}>
              <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
                <CardHeader>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.architect} — {item.year}
                  </p>
                  <CardTitle>{item.name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
