-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "LibCategory" AS ENUM ('STYLE', 'MATERIAL', 'COLOR', 'WOOD', 'STONE', 'FLOORING', 'WALL_COVERING', 'LIGHTING', 'SOFA', 'TABLE', 'CHAIR', 'STORAGE', 'KITCHEN', 'BATHROOM', 'STAIRCASE', 'TEXTILE', 'PLANT', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "BudgetTier" AS ENUM ('ECONOMY', 'MID', 'PREMIUM', 'LUXURY');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('PAIRS_WITH', 'AVOID_WITH', 'CHEAPER_ALT', 'PREMIUM_ALT', 'SAME_FAMILY');

-- Une colonne générée (STORED) exige une expression IMMUTABLE ; `to_tsvector`
-- avec un nom de configuration texte est seulement STABLE (le nom est résolu
-- via le catalogue). Enroulée dans une fonction SQL déclarée IMMUTABLE — la
-- configuration 'french' est une constante ici, donc l'engagement de
-- stabilité est vrai en pratique, pas seulement affirmé de force.
CREATE FUNCTION "library_item_search_vector"(
    name TEXT, summary TEXT, description TEXT, pros TEXT[], cons TEXT[], mistakes TEXT[]
) RETURNS tsvector AS $$
    SELECT to_tsvector('french',
        coalesce(name, '') || ' ' ||
        coalesce(summary, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        array_to_string(pros, ' ') || ' ' ||
        array_to_string(cons, ' ') || ' ' ||
        array_to_string(mistakes, ' ')
    );
$$ LANGUAGE SQL IMMUTABLE;

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "LibCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "budgetTier" "BudgetTier" NOT NULL,
    "budgetNote" TEXT,
    "maintenance" TEXT NOT NULL,
    "mistakes" TEXT[],
    "bestFor" "RoomType"[],
    "styles" TEXT[],
    "noWorksNeeded" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB NOT NULL,
    "imageAssetId" TEXT,
    -- Colonne générée par PostgreSQL, jamais écrite par Prisma ni par
    -- l'application (docs/05 M7) : toujours synchronisée avec les champs
    -- source, ne peut jamais dériver d'eux.
    "searchVector" tsvector GENERATED ALWAYS AS (
        "library_item_search_vector"("name", "summary", "description", "pros", "cons", "mistakes")
    ) STORED,
    "embedding" vector(1024),

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryRelation" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "note" TEXT,

    CONSTRAINT "LibraryRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "collection" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","itemId","collection")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryItem_slug_key" ON "LibraryItem"("slug");

-- CreateIndex
CREATE INDEX "LibraryItem_category_idx" ON "LibraryItem"("category");

-- CreateIndex
CREATE INDEX "LibraryItem_budgetTier_idx" ON "LibraryItem"("budgetTier");

-- CreateIndex
-- Recherche plein texte française (docs/05 M7, critère d'acceptation : <150ms sur 300 fiches).
CREATE INDEX "LibraryItem_searchVector_idx" ON "LibraryItem" USING GIN ("searchVector");

-- CreateIndex
-- Ancrage documentaire (RAG, ADR-0013) : plus proche voisin par cosinus.
CREATE INDEX "LibraryItem_embedding_idx" ON "LibraryItem" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryRelation_fromId_toId_type_key" ON "LibraryRelation"("fromId", "toId", "type");

-- CreateIndex
CREATE INDEX "Favorite_userId_collection_idx" ON "Favorite"("userId", "collection");

-- AddForeignKey
ALTER TABLE "LibraryRelation" ADD CONSTRAINT "LibraryRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryRelation" ADD CONSTRAINT "LibraryRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
