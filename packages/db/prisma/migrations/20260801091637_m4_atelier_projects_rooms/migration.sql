-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('PERSONAL', 'EXERCISE', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('KITCHEN', 'BATHROOM', 'LIVING', 'BEDROOM', 'OFFICE', 'HALL', 'OUTDOOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('TO_MEASURE', 'TO_DESIGN', 'IN_PROGRESS', 'VALIDATED', 'DONE');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProjectKind" NOT NULL DEFAULT 'PERSONAL',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "housingType" "Housing",
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "ceilingCm" INTEGER NOT NULL DEFAULT 250,
    "orientation" "Orientation",
    "status" "RoomStatus" NOT NULL DEFAULT 'TO_DESIGN',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomVersion" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "sceneData" JSONB NOT NULL,
    "sceneVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_kind_idx" ON "Project"("userId", "kind");

-- CreateIndex
CREATE INDEX "Room_projectId_idx" ON "Room"("projectId");

-- CreateIndex
CREATE INDEX "RoomVersion_roomId_createdAt_idx" ON "RoomVersion"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomVersion" ADD CONSTRAINT "RoomVersion_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
