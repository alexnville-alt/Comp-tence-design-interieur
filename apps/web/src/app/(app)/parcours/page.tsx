import type { Metadata } from "next";
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
  // Aucun niveau n'est encore terminé : la progression arrive avec le moteur
  // de leçons (M2). Les règles de déverrouillage, elles, sont déjà celles qui
  // seront utilisées — elles vivent dans @atelier/domain et sont testées.
  const completed: number[] = [];

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Votre parcours</h1>
        <p className="text-[var(--text-muted)]">
          {LEVELS.length} niveaux répartis en 4 phases. Vous démarrez au niveau{" "}
          {startingLevel}.
        </p>
      </header>

      <Alert tone="info" title="Structure en place, contenu à venir">
        Les titres et l'enchaînement des niveaux sont définitifs. Les leçons, quiz et
        exercices sont livrés au module M2.
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
              return (
                <li
                  key={level.number}
                  className={cn(
                    "flex items-start gap-4 rounded-[var(--radius-atelier)] border p-4",
                    // Le verrouillage se lit à l'icône, au libellé
                    // « Verrouillé » et au fond — pas à une opacité qui
                    // rendrait le texte illisible (WCAG 1.4.3).
                    unlocked
                      ? "border-[var(--border)] bg-[var(--surface-raised)]"
                      : "border-dashed border-[var(--border-strong)] bg-[var(--surface)]",
                  )}
                >
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
