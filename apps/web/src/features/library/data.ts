import { prisma, type BudgetTier, type LibCategory, type RoomType } from "@atelier/db";

/**
 * Recherche et facettes de la bibliothèque (docs/05 M7).
 *
 * `searchVector` (tsvector généré par PostgreSQL) et `embedding`
 * (`vector(1024)`, ADR-0013) sont des colonnes `Unsupported` pour Prisma :
 * le client généré ne peut ni les lire ni les filtrer via son API
 * habituelle. D'où une requête brute plutôt qu'un `findMany`.
 *
 * `$queryRawUnsafe` + un tableau de valeurs séparé — et non `$queryRaw`
 * avec des fragments `Prisma.sql` imbriqués — après avoir constaté qu'un
 * moteur Prisma sous Windows envoyait les fragments `WHERE`/`ORDER BY`
 * eux-mêmes comme des paramètres liés (`$1`, `$2`) au lieu de les insérer
 * comme texte SQL (confirmé dans les logs Postgres : la requête reçue
 * contenait littéralement `$1` / `$2` à la place des clauses). En
 * construisant la chaîne SQL nous-mêmes et en ne laissant Prisma lier que
 * les valeurs effectivement dynamiques (jamais de concaténation de valeur
 * utilisateur dans la chaîne), on évite entièrement ce chemin de code
 * défaillant sur cette plateforme.
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
  const conditions: string[] = [];
  const values: unknown[] = [];

  // Ajoute une valeur au tableau lié et renvoie son placeholder positionnel
  // (`$1`, `$2`, …) — jamais la valeur elle-même dans la chaîne SQL.
  function bind(value: unknown): string {
    values.push(value);
    return `$${values.length}`;
  }

  if (params.category) {
    conditions.push(`category = ${bind(params.category)}::"LibCategory"`);
  }
  if (params.budgetTier) {
    conditions.push(`"budgetTier" = ${bind(params.budgetTier)}::"BudgetTier"`);
  }
  if (params.bestFor) {
    conditions.push(`${bind(params.bestFor)}::"RoomType" = ANY("bestFor")`);
  }
  if (params.noWorksNeeded) {
    conditions.push(`"noWorksNeeded" = true`);
  }

  const trimmedQuery = params.query?.trim();
  if (trimmedQuery) {
    conditions.push(
      `"searchVector" @@ websearch_to_tsquery('french', ${bind(trimmedQuery)})`,
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Pertinence textuelle quand une requête est fournie ; alphabétique sinon
  // (une liste de facettes sans requête n'a pas de score à trier). Un
  // deuxième placeholder distinct pour `trimmedQuery` plutôt que de
  // réutiliser celui du `WHERE` : plus simple, et Postgres n'impose aucune
  // unicité de valeur entre paramètres.
  const orderClause = trimmedQuery
    ? `ORDER BY ts_rank("searchVector", websearch_to_tsquery('french', ${bind(trimmedQuery)})) DESC`
    : `ORDER BY name ASC`;

  // `SEARCH_LIMIT` est une constante du fichier, jamais une valeur
  // utilisateur : littéral SQL sûr, pas besoin d'un paramètre lié.
  const sql = `
    SELECT id, slug, category, name, summary, "budgetTier", "bestFor", "noWorksNeeded"
    FROM "LibraryItem"
    ${whereClause}
    ${orderClause}
    LIMIT ${SEARCH_LIMIT}
  `;

  return prisma.$queryRawUnsafe<LibrarySearchResult[]>(sql, ...values);
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
  /** Page externe présentant le matériau/style/essence — jamais hébergé ici. */
  externalLink: string | null;
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
    externalLink: item.externalLink,
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
