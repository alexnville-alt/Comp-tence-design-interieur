import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { listChallenges } from "@/features/transverse/data";

export const metadata: Metadata = { title: "Défis" };

export default async function DefisPage() {
  const user = await requireOnboardedUser();
  const items = await listChallenges(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Défis hebdomadaires</h1>
        <p className="text-[var(--text-muted)]">
          Un cas pratique par semaine, corrigé par l'assistant IA selon le même barème que
          les cas pratiques ouverts.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/defis/${item.slug}`}>
              <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
                <CardHeader>
                  <p className="text-xs text-[var(--text-muted)]">
                    Semaine {item.weekIndex}
                  </p>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                {item.bestScoreRatio !== null && (
                  <p className="px-6 pb-4 text-sm text-[var(--text-muted)]">
                    Meilleur score : {Math.round(item.bestScoreRatio * 100)} %
                  </p>
                )}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
