import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFavorites } from "@/features/library/data";
import { CATEGORY_LABELS } from "@/features/library/labels";

export const metadata: Metadata = { title: "Mes favoris — Bibliothèque" };

export default async function FavorisPage() {
  const user = await requireOnboardedUser();
  const favorites = await getFavorites(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/bibliotheque">Bibliothèque</Link> / Mes favoris
      </p>
      <header className="space-y-2">
        <h1 className="text-3xl">Mes favoris</h1>
      </header>

      {favorites.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Aucun favori pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {favorites.map((favorite) => (
            <li key={favorite.slug}>
              <Link href={`/bibliotheque/${favorite.slug}`}>
                <Card className="transition-colors hover:border-[var(--border-strong)]">
                  <CardHeader>
                    <p className="text-xs text-[var(--text-muted)]">
                      {CATEGORY_LABELS[favorite.category]}
                    </p>
                    <CardTitle>{favorite.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[var(--text-muted)]">
                    {favorite.summary}
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
