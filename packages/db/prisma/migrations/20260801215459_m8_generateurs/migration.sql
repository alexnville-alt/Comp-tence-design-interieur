-- `searchVector`/`embedding` sont des colonnes générées/`Unsupported` (M7,
-- ADR-0013) : Prisma ne les modélise pas nativement et croit, à tort, qu'un
-- `DEFAULT`/index a dérivé. Les instructions qu'il générait ici (DROP INDEX
-- puis `ALTER COLUMN ... DROP DEFAULT` sur une colonne `GENERATED ALWAYS`)
-- échouaient contre PostgreSQL — retirées à la main ; ni la colonne générée
-- ni ses index GIN/HNSW ne changent dans cette migration.

-- CreateTable
CREATE TABLE "Moodboard" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moodboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodboardItem" (
    "id" TEXT NOT NULL,
    "moodboardId" TEXT NOT NULL,
    "libraryItemId" TEXT,
    "assetId" TEXT,
    "colorHex" TEXT,
    "label" TEXT,
    "transform" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodboardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Moodboard_projectId_idx" ON "Moodboard"("projectId");

-- CreateIndex
CREATE INDEX "Moodboard_roomId_idx" ON "Moodboard"("roomId");

-- CreateIndex
CREATE INDEX "MoodboardItem_moodboardId_idx" ON "MoodboardItem"("moodboardId");

-- AddForeignKey
ALTER TABLE "Moodboard" ADD CONSTRAINT "Moodboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moodboard" ADD CONSTRAINT "Moodboard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_moodboardId_fkey" FOREIGN KEY ("moodboardId") REFERENCES "Moodboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
