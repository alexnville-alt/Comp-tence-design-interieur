-- M11 (docs/06 §4) : contenu transverse — intérieurs célèbres, projets
-- jalons, défis hebdomadaires. Voir la note en tête de schema.prisma.
--
-- Les trois lignes `DROP INDEX .../ALTER COLUMN ... DROP DEFAULT` que
-- `prisma migrate diff` génère sur `LibraryItem.searchVector`/`embedding`
-- ont été retirées à la main : ce sont de faux positifs récurrents (M7-M10),
-- Prisma ne modélise pas les colonnes générées PostgreSQL (`GENERATED ALWAYS
-- AS`) ni `Unsupported("vector(1024)")`, et les rejoue à tort à chaque diff.

-- CreateTable
CREATE TABLE "FamousInterior" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "architect" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "designIntent" TEXT NOT NULL,
    "light" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "circulation" TEXT NOT NULL,
    "takeaways" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamousInterior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "deliverables" TEXT[],
    "evaluationCriteria" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "constraint" TEXT NOT NULL,
    "gradingNotes" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "scoreRatio" DOUBLE PRECISION NOT NULL,
    "feedback" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamousInterior_slug_key" ON "FamousInterior"("slug");

-- CreateIndex
CREATE INDEX "FamousInterior_order_idx" ON "FamousInterior"("order");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneProject_slug_key" ON "MilestoneProject"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneProject_phase_key" ON "MilestoneProject"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_weekIndex_key" ON "Challenge"("weekIndex");

-- CreateIndex
CREATE INDEX "ChallengeSubmission_userId_challengeId_idx" ON "ChallengeSubmission"("userId", "challengeId");

-- AddForeignKey
ALTER TABLE "ChallengeSubmission" ADD CONSTRAINT "ChallengeSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSubmission" ADD CONSTRAINT "ChallengeSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
