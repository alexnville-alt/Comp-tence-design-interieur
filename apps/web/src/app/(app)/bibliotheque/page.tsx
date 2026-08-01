import type { Metadata } from "next";
import Link from "next/link";
import { LIB_CATEGORIES, BUDGET_TIERS } from "@atelier/domain";
import type { BudgetTier, LibCategory, RoomType } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ROOM_TYPES } from "@/features/studio/room-types";
import { ROOM_TYPE_LABELS } from "@/features/studio/room-type-labels";
import { searchLibrary } from "@/features/library/data";
import { CATEGORY_LABELS, BUDGET_TIER_LABELS } from "@/features/library/labels";

export const metadata: Metadata = { title: "Bibliothèque" };

interface BibliothequeSearchParams {
  q?: string;
  categorie?: string;
  budget?: string;
  piece?: string;
  sansTravaux?: string;
}

function isLibCategory(value: string | undefined): value is LibCategory {
  return LIB_CATEGORIES.includes(value as LibCategory);
}

function isBudgetTier(value: string | undefined): value is BudgetTier {
  return BUDGET_TIERS.includes(value as BudgetTier);
}

function isRoomType(value: string | undefined): value is RoomType {
  return ROOM_TYPES.includes(value as RoomType);
}

export default async function BibliothequePage({
  searchParams,
}: {
  searchParams: Promise<BibliothequeSearchParams>;
}) {
  await requireOnboardedUser();
  const params = await searchParams;

  const category = isLibCategory(params.categorie) ? params.categorie : undefined;
  const budgetTier = isBudgetTier(params.budget) ? params.budget : undefined;
  const bestFor = isRoomType(params.piece) ? params.piece : undefined;
  const noWorksNeeded = params.sansTravaux === "1";

  const results = await searchLibrary({
    ...(params.q ? { query: params.q } : {}),
    ...(category ? { category } : {}),
    ...(budgetTier ? { budgetTier } : {}),
    ...(bestFor ? { bestFor } : {}),
    noWorksNeeded,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl">Bibliothèque</h1>
          <Link
            href="/bibliotheque/favoris"
            className="text-sm underline underline-offset-4"
          >
            Mes favoris
          </Link>
        </div>
        <p className="text-[var(--text-muted)]">
          Styles, matériaux, couleurs, mobilier — recherchez et filtrez pour trouver la
          fiche qu'il vous faut.
        </p>
      </header>

      <form method="get" className="space-y-4" aria-label="Recherche et filtres">
        <div className="space-y-1.5">
          <Label htmlFor="q">Rechercher</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Ex. chêne, sans travaux, luminaire…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="categorie">Catégorie</Label>
            <select
              id="categorie"
              name="categorie"
              defaultValue={category ?? ""}
              className="h-11 w-full rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text)]"
            >
              <option value="">Toutes</option>
              {LIB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget">Budget</Label>
            <select
              id="budget"
              name="budget"
              defaultValue={budgetTier ?? ""}
              className="h-11 w-full rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text)]"
            >
              <option value="">Tous</option>
              {BUDGET_TIERS.map((b) => (
                <option key={b} value={b}>
                  {BUDGET_TIER_LABELS[b]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="piece">Pièce</Label>
            <select
              id="piece"
              name="piece"
              defaultValue={bestFor ?? ""}
              className="h-11 w-full rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text)]"
            >
              <option value="">Toutes</option>
              {ROOM_TYPES.map((r) => (
                <option key={r} value={r}>
                  {ROOM_TYPE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="sansTravaux"
            name="sansTravaux"
            type="checkbox"
            value="1"
            defaultChecked={noWorksNeeded}
            className="size-5 rounded border-[var(--border-strong)]"
          />
          <Label htmlFor="sansTravaux" className="font-normal">
            Sans travaux uniquement
          </Label>
        </div>

        <Button type="submit">Rechercher</Button>
      </form>

      <p className="text-sm text-[var(--text-muted)]" role="status">
        {results.length} fiche{results.length > 1 ? "s" : ""} trouvée
        {results.length > 1 ? "s" : ""}
      </p>

      {results.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucune fiche ne correspond à cette recherche.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((item) => (
            <li key={item.id}>
              <Link href={`/bibliotheque/${item.slug}`}>
                <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
                  <CardHeader>
                    <p className="text-xs text-[var(--text-muted)]">
                      {CATEGORY_LABELS[item.category]}
                    </p>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-[var(--text-muted)]">
                    <p>{item.summary}</p>
                    <p>{BUDGET_TIER_LABELS[item.budgetTier]}</p>
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
