import type { Metadata } from "next";

export const metadata: Metadata = { title: "Déclaration d'accessibilité" };

export default function AccessibilitePage() {
  return (
    <>
      <h1 className="text-3xl">Déclaration d'accessibilité</h1>
      <p className="text-[var(--text-muted)]">Établie le 2 août 2026.</p>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">État de conformité</h2>
        <p>
          Atelier vise le niveau AA des Web Content Accessibility Guidelines (WCAG)
          version 2.2. À la date de cette déclaration, Atelier est en{" "}
          <strong>conformité partielle</strong> : une grande partie du parcours a été
          auditée et corrigée, mais un audit manuel complet — clavier et lecteur d'écran,
          mené par des personnes en situation de handicap — n'a pas encore été réalisé.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Résultats des tests</h2>
        <p>Ce qui a été effectivement vérifié, de façon reproductible et automatisée :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Audit automatisé (axe-core, règles WCAG 2.0/2.1/2.2 A et AA) sur une trentaine
            d'écrans et de flux, en thème clair <strong>et</strong> sombre — zéro
            violation critique ou sérieuse tolérée, vérifié à chaque changement de code
          </li>
          <li>
            Parcours clavier complets et automatisés sur les interactions les plus
            complexes : l'atelier de dessin 2D, l'éditeur de moodboard, le lecteur de
            leçon, les sessions de révision — chacun jouable sans souris, du premier au
            dernier geste
          </li>
          <li>
            Contrastes de couleur recalculés et vérifiés par du code, jamais estimés à
            l'œil, dans les deux thèmes
          </li>
          <li>Vérification à une largeur d'écran mobile en plus du bureau</li>
        </ul>
        <p>
          Un défaut réel a été trouvé et corrigé par cette démarche : le lien d'évitement
          (« Aller au contenu principal ») déplaçait le défilement de la page sans
          déplacer le focus clavier réel — invisible à l'audit automatisé, révélé par un
          test de navigation clavier dédié.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Contenu non accessible ou non vérifié</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Aucun audit avec un lecteur d'écran réel (NVDA, JAWS, VoiceOver) n'a encore
            été conduit — l'audit automatisé n'en détecte qu'une fraction des problèmes
            possibles (annonces des régions dynamiques, ordre de lecture réel, pertinence
            des libellés en contexte)
          </li>
          <li>Aucun test n'a été mené avec des utilisateurs en situation de handicap</li>
          <li>
            L'atelier de dessin 2D (glisser-déposer, canevas) reste, par nature, plus
            exigeant au clavier qu'à la souris malgré son équivalent clavier complet
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Établissement de cette déclaration</h2>
        <p>
          Cette déclaration a été établie par auto-évaluation (audit automatisé et tests
          clavier automatisés décrits ci-dessus), sans audit externe indépendant à ce
          jour.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Retour d'information et contact</h2>
        <p>
          Si vous rencontrez un défaut d'accessibilité vous empêchant d'accéder à un
          contenu ou une fonctionnalité, décrivez-le à{" "}
          <a href="mailto:bonjour@exemple.fr">bonjour@exemple.fr</a> — nous nous engageons
          à vous répondre.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Voies de recours</h2>
        <p>
          [À COMPLÉTER avant mise en production : les voies de recours (autorité
          compétente, délais) dépendent du statut juridique réel de l'éditeur et de
          l'applicabilité du RGAA — sans objet pour ce dépôt de démonstration.]
        </p>
      </section>
    </>
  );
}
