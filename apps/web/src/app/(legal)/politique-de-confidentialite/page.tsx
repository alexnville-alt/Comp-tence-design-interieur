import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <h1 className="text-3xl">Politique de confidentialité</h1>
      <p className="text-[var(--text-muted)]">Dernière mise à jour : 2 août 2026.</p>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Responsable de traitement</h2>
        <p>
          [À COMPLÉTER avant mise en production : raison sociale, forme juridique, adresse
          du siège et contact du responsable de traitement — ce dépôt est un projet de
          démonstration et n'a pas d'identité juridique propre.] Pour toute question
          relative à cette politique, contactez{" "}
          <a href="mailto:bonjour@exemple.fr">bonjour@exemple.fr</a>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Données collectées</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte : prénom, adresse e-mail, mot de passe (haché, jamais en clair)</li>
          <li>
            Progression pédagogique : leçons terminées, réponses aux exercices, résultats
            d'évaluation, historique de révision espacée
          </li>
          <li>
            Projets personnels : adresse du logement (facultative, en clair libre), plans,
            photos de pièces, mesures, notes de journal, lignes de budget
          </li>
          <li>
            Conversations avec l'assistant IA : messages envoyés et reçus, dans le cadre
            d'une leçon ou d'un projet
          </li>
          <li>
            Mesure d'audience technique anonymisée (pages visitées, durée de session)
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Finalités et base légale</h2>
        <p>
          Le traitement de vos données de compte et de progression repose sur l'exécution
          du contrat qui vous lie à Atelier (fourniture du service). La mesure d'audience
          anonymisée repose sur l'intérêt légitime à améliorer le service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Destinataires de vos données</h2>
        <p>
          Vos données ne sont jamais vendues ni utilisées à des fins publicitaires. Elles
          peuvent être transmises à :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            L'hébergeur de la base de données et du stockage de fichiers (photos, plans),
            pour la seule finalité d'hébergement
          </li>
          <li>
            Le fournisseur d'intelligence artificielle utilisé par l'assistant pédagogique
            et l'analyse de photos (Anthropic) : le contenu d'un message ou d'une photo
            envoyée à l'assistant lui est transmis pour générer la réponse. Ce contenu
            n'est jamais utilisé pour entraîner un modèle. Un premier envoi de photo à
            l'assistant vous demande un consentement explicite (voir « Analyse photo par
            IA » ci-dessous)
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Analyse photo par IA</h2>
        <p>
          Les photos que vous déposez dans un projet restent privées par défaut. Ce n'est
          que lorsque vous demandez explicitement une analyse par l'assistant qu'une photo
          est transmise au fournisseur IA — jamais automatiquement au dépôt. La première
          fois que vous demandez une analyse, l'application vous demande de confirmer que
          vous acceptez cet envoi.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Durée de conservation</h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. Un compte resté
          inactif 24 mois reçoit une notification, puis ses données sont supprimées si
          aucune reconnexion n'intervient.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Vos droits</h2>
        <p>
          Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation
          et de portabilité de vos données, ainsi que d'un droit d'opposition pour motif
          légitime. Deux de ces droits sont directement accessibles depuis votre profil,
          sans délai d'attente :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Export</strong> : téléchargez l'intégralité de vos données au format
            JSON depuis la page <em>Profil</em>
          </li>
          <li>
            <strong>Suppression</strong> : supprimez définitivement votre compte et toutes
            les données associées depuis la page <em>Profil</em> — la suppression est
            immédiate et irréversible
          </li>
        </ul>
        <p>
          Pour tout autre exercice de vos droits, écrivez à{" "}
          <a href="mailto:bonjour@exemple.fr">bonjour@exemple.fr</a>. Vous disposez
          également du droit d'introduire une réclamation auprès de l'autorité de
          protection des données compétente.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Cookies</h2>
        <p>
          Un cookie de session (technique, non modifiable, non traçant) maintient votre
          connexion. Un cookie de préférence enregistre votre choix de thème clair ou
          sombre. Aucun cookie publicitaire ou de traçage tiers n'est déposé.
        </p>
      </section>
    </>
  );
}
