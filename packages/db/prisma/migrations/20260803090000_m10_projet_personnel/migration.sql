-- CreateEnum
CREATE TYPE "JournalKind" AS ENUM ('NOTE', 'DECISION', 'QUESTION', 'BUDGET');

-- AlterEnum
ALTER TYPE "AssetKind" ADD VALUE 'FLOOR_PLAN';

-- Le diff généré par `prisma migrate diff` incluait ici trois instructions
-- bogues sur "LibraryItem" (DROP INDEX "LibraryItem_embedding_idx", DROP
-- INDEX "LibraryItem_searchVector_idx", ALTER COLUMN "searchVector" DROP
-- DEFAULT) : Prisma ne comprend pas les colonnes `GENERATED ALWAYS AS`
-- ("searchVector") ni `Unsupported("vector(1024)")` ("embedding") et croit
-- à tort qu'elles ont dérivé — déjà rencontré et documenté en M7, M8 et M9.
-- Ces trois lignes sont volontairement omises ; rien d'autre ne change pour
-- "LibraryItem" dans cette migration.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "address" TEXT,
ADD COLUMN     "budgetCents" INTEGER;

-- CreateTable
CREATE TABLE "ProjectAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "roomId" TEXT,
    "caption" TEXT,
    "calibration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "JournalKind" NOT NULL DEFAULT 'NOTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAsset_projectId_roomId_idx" ON "ProjectAsset"("projectId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAsset_projectId_assetId_key" ON "ProjectAsset"("projectId", "assetId");

-- CreateIndex
CREATE INDEX "JournalEntry_projectId_createdAt_idx" ON "JournalEntry"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
