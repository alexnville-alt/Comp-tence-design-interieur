/**
 * Garde-fous — pré-filtrage des sujets à risque (docs/02 §5.4, AI-09).
 *
 * Premier des trois niveaux de garde-fou : une question touchant à la
 * structure ou à la sécurité du logement (mur porteur, électricité, gaz,
 * amiante, plomb) reçoit une réponse type de renvoi vers un professionnel,
 * **sans jamais appeler le fournisseur IA** — critère d'acceptation
 * explicite de M5 (docs/05). Une fonction pure, testable sans réseau ni
 * fournisseur : c'est délibérément ici, dans `packages/domain`, et non dans
 * `packages/ai`, pour rester exécutable sans configuration IA.
 *
 * Un faux négatif (sujet à risque non détecté) laisse l'IA répondre, cadrée
 * par le prompt système (niveau 2) puis la validation de schéma (niveau 3) —
 * ce filtre est une first line of defense, pas la seule.
 */

export type RiskyTopic = "mur_porteur" | "electricite" | "gaz" | "amiante" | "plomb";

export interface RiskyTopicMatch {
  topic: RiskyTopic;
  /** Réponse à afficher telle quelle, sans appel IA. */
  message: string;
}

const PROFESSIONAL_REFERRAL =
  "Cette question touche à la sécurité ou à la structure du logement : elle doit être " +
  "évaluée sur place par un professionnel qualifié, pas depuis une description écrite. ";

const PATTERNS: { topic: RiskyTopic; regex: RegExp; profession: string }[] = [
  {
    topic: "mur_porteur",
    // Le gap borné entre « mur » et « porteur » couvre les tournures
    // naturelles (« ce mur est porteur », « mur qui semble porteur ») sans
    // exiger l'adjacence stricte de « mur porteur ».
    regex:
      /\bmur[s]?\b[^.?!]{0,25}\bporteur\b|\bporteur\s+ou\s+pas\b|\babattre\s+(un|ce|le)\s+mur\b/i,
    profession: "un bureau d'études structure ou un maçon qualifié",
  },
  {
    topic: "electricite",
    // Pas de \b final après « électricité » : ce mot se termine par « é »,
    // que le moteur regex JS ne traite pas comme un caractère de mot (\w est
    // ASCII-only), donc \b n'y détecterait jamais de transition valide.
    regex:
      /\btableau\s+électrique\b|\binstallation\s+électrique\b|\bdisjoncteur\b|\brefaire\s+l['’]électricité|\baux\s+normes\s+électriques\b/i,
    profession: "un électricien certifié (attestation Consuel)",
  },
  {
    topic: "gaz",
    regex: /\bgaz\b|\bchaudière\s+à\s+gaz\b|\bfuite\s+de\s+gaz\b/i,
    profession: "un professionnel agréé gaz",
  },
  {
    topic: "amiante",
    regex: /\bamiante\b/i,
    profession: "un diagnostiqueur certifié amiante",
  },
  {
    topic: "plomb",
    regex: /\bplomb\b/i,
    profession: "un diagnostiqueur certifié plomb (CREP)",
  },
];

/**
 * Détecte un sujet à risque dans un message. `null` si rien n'a matché —
 * le message peut alors être envoyé au fournisseur IA normalement.
 */
export function detectRiskyTopic(message: string): RiskyTopicMatch | null {
  for (const { topic, regex, profession } of PATTERNS) {
    if (regex.test(message)) {
      return {
        topic,
        message: `${PROFESSIONAL_REFERRAL}Contactez ${profession} avant toute intervention.`,
      };
    }
  }
  return null;
}
