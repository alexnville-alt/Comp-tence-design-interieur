import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { ROOM_TYPE_LABELS } from "@/features/studio/room-type-labels";
import { getLibraryItemDetail, type RelatedItem } from "@/features/library/data";
import {
  CATEGORY_LABELS,
  BUDGET_TIER_LABELS,
  RELATION_TYPE_LABELS,
} from "@/features/library/labels";
import { formatAttributeEntries } from "@/features/library/attribute-format";
import { FavoriteButton } from "@/features/library/favorite-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Bibliothèque` };
}

function RelationGroup({ title, items }: { title: string; items: RelatedItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((related) => (
          <li key={related.slug}>
            <Link
              href={`/bibliotheque/${related.slug}`}
              className="inline-block rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
            >
              {related.name}
              <span className="ml-1 text-xs text-[var(--text-muted)]">
                ({CATEGORY_LABELS[related.category]})
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireOnboardedUser();
  const item = await getLibraryItemDetail(slug, user.id);
  if (!item) notFound();

  const attributeEntries = formatAttributeEntries(item.attributes);
  const hasRelations =
    item.relations.pairsWith.length > 0 ||
    item.relations.avoidWith.length > 0 ||
    item.relations.cheaperAlt.length > 0 ||
    item.relations.premiumAlt.length > 0 ||
    item.relations.sameFamily.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/bibliotheque">Bibliothèque</Link> / {item.name}
      </p>

      <header className="space-y-2">
        <p className="text-xs text-[var(--text-muted)]">
          {CATEGORY_LABELS[item.category]}
        </p>
        <h1 className="text-3xl">{item.name}</h1>
        <p className="text-[var(--text-muted)]">{item.summary}</p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm">
            {BUDGET_TIER_LABELS[item.budgetTier]}
          </span>
          {item.noWorksNeeded && (
            <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm">
              Sans travaux
            </span>
          )}
          <FavoriteButton slug={item.slug} initialFavorite={item.isFavorite} />
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Description</h2>
        <p>{item.description}</p>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Avantages</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {item.pros.map((pro) => (
              <li key={pro}>{pro}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Inconvénients</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {item.cons.map((con) => (
              <li key={con}>{con}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Entretien</h2>
        <p className="text-sm">{item.maintenance}</p>
        {item.budgetNote && (
          <p className="text-sm text-[var(--text-muted)]">{item.budgetNote}</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Erreurs à éviter</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.mistakes.map((mistake) => (
            <li key={mistake}>{mistake}</li>
          ))}
        </ul>
      </section>

      {attributeEntries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Caractéristiques</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {attributeEntries.map((entry) => (
              <div
                key={entry.key}
                className="flex justify-between gap-2 border-b border-[var(--border)] py-1"
              >
                <dt className="text-[var(--text-muted)]">{entry.label}</dt>
                <dd className="text-right">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {item.bestFor.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Recommandé pour</h2>
          <p className="text-sm">
            {item.bestFor.map((r) => ROOM_TYPE_LABELS[r]).join(", ")}
          </p>
        </section>
      )}

      {hasRelations && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Associations</h2>
          <RelationGroup
            title={RELATION_TYPE_LABELS.PAIRS_WITH}
            items={item.relations.pairsWith}
          />
          <RelationGroup
            title={RELATION_TYPE_LABELS.AVOID_WITH}
            items={item.relations.avoidWith}
          />
          <RelationGroup
            title={RELATION_TYPE_LABELS.CHEAPER_ALT}
            items={item.relations.cheaperAlt}
          />
          <RelationGroup
            title={RELATION_TYPE_LABELS.PREMIUM_ALT}
            items={item.relations.premiumAlt}
          />
          <RelationGroup
            title={RELATION_TYPE_LABELS.SAME_FAMILY}
            items={item.relations.sameFamily}
          />
        </section>
      )}
    </div>
  );
}
