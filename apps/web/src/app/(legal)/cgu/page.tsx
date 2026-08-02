import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales d'utilisation" };

export default function CguPage() {
  return (
    <>
      <h1 className="text-3xl">Conditions générales d'utilisation</h1>
      <p className="text-[var(--text-muted)]">Dernière mise à jour : 2 août 2026.</p>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">1. Objet</h2>
        <p>
          Atelier est un outil pédagogique d'apprentissage du design d'intérieur :
          parcours de leçons, exercices notés, un atelier de dessin de plans, des
          générateurs (palette, moodboard, liste de mobilier) et un assistant
          conversationnel. Les présentes conditions régissent l'utilisation du service par
          tout utilisateur disposant d'un compte.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">2. Nature pédagogique du service</h2>
        <p>
          Atelier est un outil pédagogique. Il ne remplace ni un architecte, ni un maître
          d'œuvre, ni un bureau d'études, ni un diagnostic technique réalisé sur place.
          Toute intervention structurelle, électrique ou de gaz relève exclusivement d'un
          professionnel qualifié, quelle que soit la réponse obtenue de l'assistant.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">3. L'assistant IA</h2>
        <p>
          L'assistant conversationnel s'appuie sur un modèle de langage : ses réponses
          peuvent être imprécises ou incorrectes, et doivent être vérifiées avant toute
          mise en œuvre. Un mécanisme de garde-fous détecte les questions touchant à la
          sécurité ou à la structure du logement (mur porteur, électricité, gaz) et
          renvoie systématiquement vers un professionnel plutôt que de répondre — sans
          jamais appeler le modèle sur ces sujets.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">4. Compte utilisateur</h2>
        <p>
          La création d'un compte requiert une adresse e-mail valide et un mot de passe.
          Vous êtes responsable de la confidentialité de vos identifiants. Un compte est
          strictement personnel et ne peut être partagé.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">5. Contenu</h2>
        <p>
          Les leçons, fiches et analyses d'intérieurs célèbres publiées sur Atelier sont
          des créations originales, protégées par le droit d'auteur. Les intérieurs
          célèbres sont décrits et analysés en texte original, jamais illustrés par des
          photographies sous droits. Le contenu que vous déposez (photos, plans, notes de
          projet) reste votre propriété ; vous nous autorisez à le traiter dans la seule
          mesure nécessaire au fonctionnement du service (stockage, affichage, analyse IA
          à votre demande — voir la{" "}
          <a href="/politique-de-confidentialite">politique de confidentialité</a>).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">6. Suppression de compte</h2>
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis la page Profil. La
          suppression est immédiate, irréversible, et efface l'ensemble de vos données
          associées.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">7. Responsabilité</h2>
        <p>
          Atelier est fourni « en l'état ». Nous mettons en œuvre des moyens raisonnables
          pour assurer la disponibilité et l'exactitude du service, sans garantie
          d'absence totale d'erreur ou d'interruption. Vous seul(e) êtes responsable des
          décisions prises et des travaux entrepris sur la base des informations fournies
          par Atelier.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">8. Modification des présentes conditions</h2>
        <p>
          Ces conditions peuvent être modifiées ; la date de dernière mise à jour en haut
          de cette page en fait foi. Une modification substantielle vous sera signalée.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">9. Contact et droit applicable</h2>
        <p>
          Pour toute question : <a href="mailto:bonjour@exemple.fr">bonjour@exemple.fr</a>
          . [À COMPLÉTER avant mise en production : droit applicable et juridiction
          compétente, dépendants de la raison sociale réelle de l'éditeur.]
        </p>
      </section>
    </>
  );
}
