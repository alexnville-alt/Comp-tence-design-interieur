import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getChallengeDetail } from "@/features/transverse/data";
import { ChallengePlayer } from "@/features/transverse/challenge-player";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Défis` };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireOnboardedUser();
  const challenge = await getChallengeDetail(user.id, slug);
  if (!challenge) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/defis">Défis</Link> / {challenge.title}
      </p>

      <header className="space-y-2">
        <p className="text-xs text-[var(--text-muted)]">Semaine {challenge.weekIndex}</p>
        <h1 className="text-3xl">{challenge.title}</h1>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Scénario</h2>
        <p className="text-sm">{challenge.scenario}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Contrainte</h2>
        <p className="text-sm">{challenge.constraint}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Votre réponse</h2>
        <ChallengePlayer challengeId={challenge.id} slug={challenge.slug} />
      </section>

      {challenge.submissions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Tentatives précédentes</h2>
          <ul className="space-y-2">
            {challenge.submissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-[var(--radius-atelier)] border border-[var(--border)] p-3 text-sm"
              >
                <p className="font-medium">
                  Tentative {submission.attempt} — {submission.score}/{challenge.maxScore}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {submission.createdAt.toLocaleDateString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
