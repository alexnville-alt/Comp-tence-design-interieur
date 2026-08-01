import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@atelier/db";
import { Lock } from "lucide-react";
import { LEVELS, PHASES, isLevelUnlocked, levelsOfPhase } from "@atelier/domain";
import { Alert } from "@/components/ui/alert";
import { requireOnboardedUser } from "@/lib/auth";
import { cn } from "@atelier/ui";

export const metadata: Metadata = { title: "Parcours" };

export default async function ParcoursPage() {
  const user = await requireOnboardedUser();

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { startingLevel: true },
  });

  const startingLevel = profile?.startingLevel ?? 1;
  const completedLevelProgress = await prisma.levelProgress.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    select: { level: { select: { number: true } } },
  });
  const completed = completedLevelProgress.map((p) => p.level.number);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Votre parcours</h1>
        <p className="text-[var(--text-muted)]">
          {LEVELS.length} niveaux répartis en 4 phases. Vous démarrez au niveau{" "}
          {startingLevel}.
        </p>
      </header>

      <Alert tone="info" title="Contenu en cours de publication">
        Les titres et l'enchaînement des niveaux sont définitifs. Les leçons se publient
        niveau par niveau ; le niveau 1 est déjà disponible.
      </Alert>

      {PHASES.map((phase) => (
        <section key={phase.number} className="space-y-4">
          <div>
            <h2 className="text-xl">
              Phase {phase.number} — {phase.title}
            </h2>
            <p className="text-sm italic text-[var(--text-muted)]">
              Projet jalon : {phase.milestone}
            </p>
          </div>

          <ul className="space-y-2">
            {levelsOfPhase(phase.number).map((level) => {
              const unlocked = isLevelUnlocked(level.number, completed, startingLevel);
              const content = (
                <>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-mono)] text-sm",
                      unlocked
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "bg-[var(--surface-raised)] text-[var(--text-muted)]",
                    )}
                    aria-hidden="true"
                  >
                    {level.number}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {level.title}
                      {!unlocked ? (
                        <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-normal text-[var(--text-muted)]">
                          <Lock className="size-3" aria-hidden="true" />
                          Verrouillé
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">{level.summary}</p>
                  </div>

                  <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                    {Math.round(level.estimatedMinutes / 60)} h
                  </span>
                </>
              );

              const className = cn(
                "flex items-start gap-4 rounded-[var(--radius-atelier)] border p-4",
                // Le verrouillage se lit à l'icône, au libellé
                // « Verrouillé » et au fond — pas à une opacité qui
                // rendrait le texte illisible (WCAG 1.4.3).
                unlocked
                  ? "border-[var(--border)] bg-[var(--surface-raised)]"
                  : "border-dashed border-[var(--border-strong)] bg-[var(--surface)]",
              );

              return (
                <li key={level.number}>
                  {unlocked ? (
                    <Link
                      href={`/parcours/${level.slug}`}
                      className={cn(
                        className,
                        "transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      )}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
