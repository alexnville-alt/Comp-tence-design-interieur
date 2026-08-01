-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('ROOM_PHOTO');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoAnalysis" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "roomId" TEXT,
    "result" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_userId_kind_idx" ON "Asset"("userId", "kind");

-- CreateIndex
CREATE INDEX "Asset_sha256_idx" ON "Asset"("sha256");

-- CreateIndex
CREATE INDEX "PhotoAnalysis_assetId_createdAt_idx" ON "PhotoAnalysis"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoAnalysis_roomId_createdAt_idx" ON "PhotoAnalysis"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAnalysis" ADD CONSTRAINT "PhotoAnalysis_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
