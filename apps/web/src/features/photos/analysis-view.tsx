import Link from "next/link";
import type { AnalysePhoto } from "@atelier/domain";
import { Button } from "@/components/ui/button";

/**
 * Affichage d'une analyse photo (M6, docs/05).
 *
 * Composant serveur, délibérément : les repères numérotés sont de simples
 * ancres (`<a href="#probleme-N">`) vers la liste en dessous, pas des
 * boutons pilotés par du JavaScript. La navigation par ancre est nativement
 * accessible au clavier — aucune interactivité client à écrire ni à tester
 * pour ce que `<a>` fait déjà.
 */

const EFFORT_LABELS: Record<string, string> = {
  immediat: "Immédiat",
  "week-end": "Un week-end",
  travaux: "Travaux",
};

const BUDGET_LABELS: Record<string, string> = {
  "0-100": "0 à 100 € (ordre de grandeur)",
  "100-500": "100 à 500 € (ordre de grandeur)",
  "500-2000": "500 à 2 000 € (ordre de grandeur)",
  "2000+": "Plus de 2 000 € (ordre de grandeur)",
};

const GRAVITE_LABELS: Record<string, string> = {
  mineur: "Mineur",
  moyen: "Moyen",
  majeur: "Majeur",
};

export function PhotoAnalysisView({
  result,
  readUrl,
  openInAtelierHref,
}: {
  result: AnalysePhoto;
  readUrl: string;
  openInAtelierHref: string | null;
}) {
  if (!result.pertinente) {
    return (
      <div
        role="status"
        className="space-y-4 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface-raised)] p-6"
      >
        <img
          src={readUrl}
          alt="Photo téléversée"
          className="w-full rounded-[var(--radius-atelier)]"
        />
        <p className="text-[var(--text)]">{result.raison}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)]">
        {/* URL présignée temporaire (ADR-0008), pas un asset local optimisable par next/image. */}
        <img src={readUrl} alt="Photo de la pièce analysée" className="w-full" />
        {result.problemes.map((probleme) => (
          <a
            key={probleme.numero}
            href={`#probleme-${probleme.numero}`}
            aria-label={`Voir le problème ${probleme.numero} : ${probleme.titre}`}
            className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--surface-raised)] text-sm font-medium text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            style={{ left: `${probleme.repere.x}%`, top: `${probleme.repere.y}%` }}
          >
            {probleme.numero}
          </a>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-muted)]">Style détecté</h3>
          <p className="text-[var(--text)]">{result.styleDetecte.principal}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--text-muted)]">Proportions</h3>
          <p className="text-[var(--text)]">{result.proportions.constat}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--text-muted)]">Circulation</h3>
          <p className="text-[var(--text)]">{result.circulation.constat}</p>
        </div>
      </section>

      <div>
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Lumière</h3>
        <p className="text-[var(--text)]">{result.lumiere.constat}</p>
      </div>

      <section aria-labelledby="problemes-heading" className="space-y-3">
        <h2 id="problemes-heading" className="text-xl">
          Problèmes repérés
        </h2>
        <ol className="space-y-3">
          {result.problemes.map((probleme) => (
            <li
              id={`probleme-${probleme.numero}`}
              key={probleme.numero}
              className="scroll-mt-20 rounded-[var(--radius-atelier)] border border-[var(--border)] p-4"
            >
              <p className="font-medium text-[var(--text)]">
                {probleme.numero}. {probleme.titre} —{" "}
                <span className="text-sm text-[var(--text-muted)]">
                  {GRAVITE_LABELS[probleme.gravite]}
                </span>
              </p>
              <p className="text-sm text-[var(--text-muted)]">{probleme.pourquoi}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ameliorations-heading" className="space-y-3">
        <h2 id="ameliorations-heading" className="text-xl">
          Améliorations proposées
        </h2>
        <ul className="space-y-3">
          {result.ameliorations.map((amelioration) => (
            <li
              key={amelioration.action}
              className="rounded-[var(--radius-atelier)] border border-[var(--border)] p-4"
            >
              <p className="font-medium text-[var(--text)]">{amelioration.action}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {amelioration.pourquoiCaMarche}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Effort : {EFFORT_LABELS[amelioration.effort]} · Budget :{" "}
                {BUDGET_LABELS[amelioration.budget]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">
          Critique de synthèse
        </h2>
        <p className="text-[var(--text)]">{result.critique}</p>
      </section>

      {openInAtelierHref ? (
        <Button asChild>
          <Link href={openInAtelierHref}>Ouvrir dans l'atelier</Link>
        </Button>
      ) : null}
    </div>
  );
}
