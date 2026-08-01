import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@atelier/db";
import { requireOnboardedUser } from "@/lib/auth";
import { ExerciseBlock } from "@/features/exercises/exercise-block";
import { FinalizeAssessmentButton } from "@/features/assessment/finalize-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niveau: string }>;
}): Promise<Metadata> {
  const { niveau } = await params;
  const level = await prisma.level.findUnique({
    where: { slug: niveau },
    include: { assessment: true },
  });
  return { title: level?.assessment?.title ?? "Évaluation" };
}

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ niveau: string }>;
}) {
  await requireOnboardedUser();
  const { niveau } = await params;

  const level = await prisma.level.findUnique({
    where: { slug: niveau },
    include: {
      assessment: { include: { exercises: { orderBy: { order: "asc" } } } },
    },
  });
  if (!level?.assessment) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
          Niveau {level.number} · {level.title}
        </p>
        <h1 className="text-3xl">{level.assessment.title}</h1>
        <p className="text-[var(--text-muted)]">
          Seuil de réussite : {level.assessment.passingScore}/100. Un échec ne verrouille
          rien — vous pouvez retenter autant de fois que nécessaire.
        </p>
      </header>

      <div className="space-y-4">
        {level.assessment.exercises.map((exercise) => (
          <ExerciseBlock key={exercise.id} exercise={exercise} />
        ))}
      </div>

      <FinalizeAssessmentButton
        assessmentId={level.assessment.id}
        parcoursHref={`/parcours/${level.slug}`}
      />
    </div>
  );
}
