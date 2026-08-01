import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@atelier/db";
import { GOAL_LABELS, LEVELS, getLevel } from "@atelier/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      goal: true,
      weeklyMinutes: true,
      startingLevel: true,
      totalXp: true,
      currentStreak: true,
    },
  });

  const startingLevel = getLevel(profile?.startingLevel ?? 1);
  const firstName = user.name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl">Bonjour {firstName}</h1>
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
          {profile?.totalXp ?? 0} XP · série {profile?.currentStreak ?? 0} j
        </p>
      </header>

      {params.bienvenue === "1" ? (
        <Alert tone="success" title="Votre compte est prêt">
          Nous vous avons positionné au niveau {profile?.startingLevel ?? 1}. Vous pourrez
          ajuster votre rythme à tout moment depuis votre profil.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Prochaine étape</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              Niveau {startingLevel?.number} · {startingLevel?.title}
            </p>
            <p className="mt-1 text-[var(--text)]">{startingLevel?.summary}</p>
          </div>

          {/* Honnêteté sur l'état d'avancement : le moteur de leçons est le
              module suivant. Afficher un faux bouton « Commencer » qui ne mène
              nulle part serait pire qu'un message clair. */}
          <Alert tone="info" title="Les leçons arrivent au module M2">
            Le moteur de leçons, les quiz et les exercices sont en cours de construction.
            La structure des 15 niveaux est déjà en place : consultez-la depuis le
            parcours.
          </Alert>

          <Button asChild variant="secondary">
            <Link href="/parcours">Voir le parcours</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Votre objectif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{GOAL_LABELS[profile?.goal ?? "WHOLE_HOME"]}</p>
            <p className="text-[var(--text-muted)]">
              {Math.round((profile?.weeklyMinutes ?? 150) / 6) / 10} h par semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le parcours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{LEVELS.length} niveaux, 4 phases</p>
            <p className="text-[var(--text-muted)]">
              Du vocabulaire de base au dossier de rénovation complet
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
