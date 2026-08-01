import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { LEVELS, PHASES, TOTAL_ESTIMATED_MINUTES } from "@atelier/domain";

export default async function AccueilPage() {
  // Un utilisateur connecté va directement à son tableau de bord : la page
  // d'accueil publique ne lui apprendrait rien.
  if (await getCurrentUser()) redirect("/tableau-de-bord");

  const heures = Math.round(TOTAL_ESTIMATED_MINUTES / 60);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Atelier
        </span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/inscription">Commencer</Link>
          </Button>
        </nav>
      </header>

      <main id="contenu" className="mx-auto max-w-6xl px-6">
        <section className="py-16 md:py-24">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
            Design d'intérieur · {LEVELS.length} niveaux · ≈ {heures} h
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight md:text-6xl">
            Concevez vous-même chaque pièce de votre maison.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--text-muted)]">
            Un parcours structuré du débutant complet au niveau professionnel, un atelier
            pour dessiner vos plans, et un assistant qui critique votre travail comme le
            ferait un architecte d'intérieur.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/inscription">Créer mon compte</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/connexion">J'ai déjà un compte</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-16">
          <h2 className="text-2xl">Le parcours</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((phase) => (
              <div key={phase.number} className="space-y-3">
                <p className="text-sm font-medium text-[var(--accent)]">
                  Phase {phase.number} — {phase.title}
                </p>
                <ul className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  {LEVELS.filter((level) => level.phase === phase.number).map((level) => (
                    <li key={level.number}>
                      {level.number}. {level.title}
                    </li>
                  ))}
                </ul>
                <p className="text-xs italic text-[var(--text-muted)]">
                  Projet : {phase.milestone}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-[var(--text-muted)]">
        Outil pédagogique. Ne remplace pas un maître d'œuvre ni un bureau d'études : toute
        intervention structurelle, électrique ou gaz relève d'un professionnel qualifié.
      </footer>
    </div>
  );
}
