import {
  Prisma,
  prisma,
  type BudgetTier,
  type LibCategory,
  type RoomType,
} from "@atelier/db";

/**
 * Recherche et facettes de la bibliothèque (docs/05 M7).
 *
 * `searchVector` (tsvector généré par PostgreSQL) et `embedding`
 * (`vector(1024)`, ADR-0013) sont des colonnes `Unsupported` pour Prisma :
 * le client généré ne peut ni les lire ni les filtrer via son API
 * habituelle. D'où `$queryRaw` ici plutôt qu'un `findMany` — les seuls
 * champs réellement dynamiques (catégorie, budget, pièce, requête texte)
 * passent par des paramètres liés (`Prisma.sql`), jamais par de la
 * concaténation de chaîne : aucune valeur utilisateur n'atteint le SQL sous
 * forme de texte brut.
 */

export interface LibrarySearchParams {
  query?: string;
  category?: LibCategory;
  budgetTier?: BudgetTier;
  bestFor?: RoomType;
  noWorksNeeded?: boolean;
}

export interface LibrarySearchResult {
  id: string;
  slug: string;
  category: LibCategory;
  name: string;
  summary: string;
  budgetTier: BudgetTier;
  bestFor: RoomType[];
  noWorksNeeded: boolean;
}

/**
 * Large marge au-dessus du volume réel (docs/05 M7 vise ≥ 300 fiches à
 * terme) : une page de résultats n'a pas besoin de tout afficher, mais ne
 * doit pas non plus tronquer silencieusement une recherche par facette large
 * (ex. toutes les fiches « sans travaux »).
 */
const SEARCH_LIMIT = 100;

export async function searchLibrary(
  params: LibrarySearchParams,
): Promise<LibrarySearchResult[]> {
  const conditions: Prisma.Sql[] = [];

  if (params.category) {
    conditions.push(Prisma.sql`category = ${params.category}::"LibCategory"`);
  }
  if (params.budgetTier) {
    conditions.push(Prisma.sql`"budgetTier" = ${params.budgetTier}::"BudgetTier"`);
  }
  if (params.bestFor) {
    conditions.push(Prisma.sql`${params.bestFor}::"RoomType" = ANY("bestFor")`);
  }
  if (params.noWorksNeeded) {
    conditions.push(Prisma.sql`"noWorksNeeded" = true`);
  }

  const trimmedQuery = params.query?.trim();
  if (trimmedQuery) {
    conditions.push(
      Prisma.sql`"searchVector" @@ websearch_to_tsquery('french', ${trimmedQuery})`,
    );
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  // Pertinence textuelle quand une requête est fournie ; alphabétique sinon
  // (une liste de facettes sans requête n'a pas de score à trier).
  const orderClause = trimmedQuery
    ? Prisma.sql`ORDER BY ts_rank("searchVector", websearch_to_tsquery('french', ${trimmedQuery})) DESC`
    : Prisma.sql`ORDER BY name ASC`;

  return prisma.$queryRaw<LibrarySearchResult[]>`
    SELECT id, slug, category, name, summary, "budgetTier", "bestFor", "noWorksNeeded"
    FROM "LibraryItem"
    ${whereClause}
    ${orderClause}
    LIMIT ${SEARCH_LIMIT}
  `;
}

export interface RelatedItem {
  slug: string;
  name: string;
  category: LibCategory;
  summary: string;
  note: string | null;
}

export interface LibraryItemDetail {
  id: string;
  slug: string;
  category: LibCategory;
  name: string;
  summary: string;
  description: string;
  pros: string[];
  cons: string[];
  budgetTier: BudgetTier;
  budgetNote: string | null;
  maintenance: string;
  mistakes: string[];
  bestFor: RoomType[];
  styles: string[];
  noWorksNeeded: boolean;
  attributes: Record<string, unknown>;
  isFavorite: boolean;
  relations: {
    pairsWith: RelatedItem[];
    avoidWith: RelatedItem[];
    cheaperAlt: RelatedItem[];
    premiumAlt: RelatedItem[];
    sameFamily: RelatedItem[];
  };
}

/**
 * Toutes les relations pertinentes pour une fiche sont accessibles depuis
 * `relationsFrom` : `checkRelationSymmetry` (`@atelier/domain`) garantit à la
 * synchronisation qu'une relation existe dans les deux sens (ou, pour
 * `CHEAPER_ALT`/`PREMIUM_ALT`, sous sa forme inverse) — inutile de fusionner
 * `relationsTo` ici, ce serait strictement redondant.
 */
export async function getLibraryItemDetail(
  slug: string,
  userId: string,
): Promise<LibraryItemDetail | null> {
  const item = await prisma.libraryItem.findUnique({
    where: { slug },
    include: {
      relationsFrom: { include: { to: true } },
      favorites: { where: { userId }, select: { userId: true } },
    },
  });
  if (!item) return null;

  const relations: LibraryItemDetail["relations"] = {
    pairsWith: [],
    avoidWith: [],
    cheaperAlt: [],
    premiumAlt: [],
    sameFamily: [],
  };
  const keyByType: Record<string, keyof typeof relations> = {
    PAIRS_WITH: "pairsWith",
    AVOID_WITH: "avoidWith",
    CHEAPER_ALT: "cheaperAlt",
    PREMIUM_ALT: "premiumAlt",
    SAME_FAMILY: "sameFamily",
  };
  for (const relation of item.relationsFrom) {
    relations[keyByType[relation.type]!].push({
      slug: relation.to.slug,
      name: relation.to.name,
      category: relation.to.category,
      summary: relation.to.summary,
      note: relation.note,
    });
  }

  return {
    id: item.id,
    slug: item.slug,
    category: item.category,
    name: item.name,
    summary: item.summary,
    description: item.description,
    pros: item.pros,
    cons: item.cons,
    budgetTier: item.budgetTier,
    budgetNote: item.budgetNote,
    maintenance: item.maintenance,
    mistakes: item.mistakes,
    bestFor: item.bestFor,
    styles: item.styles,
    noWorksNeeded: item.noWorksNeeded,
    attributes: item.attributes as Record<string, unknown>,
    isFavorite: item.favorites.length > 0,
    relations,
  };
}

export interface FavoriteEntry {
  slug: string;
  name: string;
  category: LibCategory;
  summary: string;
  collection: string;
}

export async function getFavorites(userId: string): Promise<FavoriteEntry[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((f) => ({
    slug: f.item.slug,
    name: f.item.name,
    category: f.item.category,
    summary: f.item.summary,
    collection: f.collection,
  }));
}
