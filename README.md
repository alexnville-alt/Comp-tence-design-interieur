# Atelier — Plateforme d'apprentissage du design d'intérieur

> Le « Duolingo du design d'intérieur », combiné à la rigueur d'une école
> d'architecture et aux outils d'un cabinet de décoration.

**Objectif** : amener un débutant complet à un niveau quasi professionnel,
capable de concevoir et rénover lui-même l'intégralité de son habitation.

---

## État du projet

| Phase       | Contenu                                                                  | Statut               |
| ----------- | ------------------------------------------------------------------------ | -------------------- |
| **Phase 0** | Cahier des charges, architecture, UX, modèle de données, roadmap         | ✅ Validée           |
| **M0**      | Socle technique (monorepo, CI, tokens, Docker)                           | ✅ Livrée            |
| **M1**      | Authentification, onboarding, profil, RGPD                               | ✅ Livrée            |
| **M2**      | Moteur de leçons (MDX, 11 blocs, reprise exacte, carte de parcours)      | ✅ Livrée            |
| **M3**      | Exercices notés, évaluations de fin de niveau, répétition espacée FSRS-6 | ✅ Livrée            |
| **M4**      | Atelier 2D (plan, mobilier, circulation, versions)                       | ✅ Livrée            |
| **M5**      | Couche IA : chat, garde-fous, quotas, correction de cas ouverts          | ✅ Livrée            |
| **M6**      | Analyse photo (dépôt S3, garde-fous, repères, cache SHA-256)             | ✅ Livrée            |
| **M7**      | Bibliothèque (recherche, facettes, relations, favoris, embeddings)       | ✅ Livrée            |
| **M8**      | Générateurs (palette, moodboard, mobilier dimensionné)                   | ✅ Livrée            |
| **M9**      | Progression et gamification (XP, séries, badges, temps réel)             | ✅ Livrée            |
| **M10**     | Projet personnel (plan calibré, journal, architecte accompagnateur, PDF) | ✅ Livrée            |
| **M11**     | Contenu des 15 niveaux (leçons, intérieurs célèbres, jalons, défis)      | ✅ Livrée            |
| **M12**     | Finitions et mise en production (dernier module de la feuille de route)  | ✅ Livrée et validée |

Conformément à la méthodologie demandée, chaque module a attendu une
validation explicite avant que le suivant ne démarre. M12 était le dernier
module de [docs/05](docs/05-feuille-de-route.md) : sa validation clôt le
découpage M0→M12 — **la feuille de route est intégralement livrée et
validée**. Historique des livraisons : commits `feat(m0,m1)`, `feat(m2)`,
`feat(m3)`, `feat(m4)`, `feat(m5)`, `feat(m6)`, `feat(m7)`, `feat(m8)`,
`feat(m9)`, `feat(m10)`, `feat(m11)`, `feat(m12)` sur la branche
`claude/interior-design-learning-platform-bam6l6`.

**État à la fin de M12** — 556 tests unitaires, 60 tests de bout en bout (dont
l'audit d'accessibilité axe-core sur 31 écrans/flux, en thème clair et sombre,
et une suite dédiée aux en-têtes de sécurité), lint, types et format vérifiés
en intégration continue.

| Vérification                 | Commande                                | Résultat                                       |
| ---------------------------- | --------------------------------------- | ---------------------------------------------- |
| Tests unitaires              | `pnpm test`                             | 556 ✅ (domaine 332 · IA 62 · app 129 · ui 33) |
| Bout en bout + accessibilité | `pnpm e2e`                              | 60 ✅                                          |
| Budgets de performance       | `pnpm perf:budgets`                     | ✅ tableau de bord et lecteur de leçon         |
| Types (6 paquets)            | `pnpm typecheck`                        | ✅                                             |
| Lint (6 paquets)             | `pnpm lint`                             | ✅                                             |
| Format                       | `pnpm format:check`                     | ✅                                             |
| Build de production          | `pnpm build`                            | ✅ 41 routes                                   |
| Restauration de sauvegarde   | `pnpm db:backup` puis `pnpm db:restore` | ✅ testée en conditions réelles (M12)          |

Le paquet domaine (`packages/domain`) reste à ~99,6 % de couverture de
lignes — FSRS-6 (`srs/`), la correction d'exercices (`exercises/`), la
géométrie de l'atelier (`geometry/` : collisions SAT, circulation par plus
court chemin le plus large, dégagements) et les garde-fous IA (`ai/`) y sont
testés sans base de données ni navigateur. Le nouveau paquet `packages/ai`
(port `AiProvider`, adaptateur factice, convertisseur Zod → JSON Schema) est
à ~99 % de couverture — l'adaptateur Anthropic lui-même en est exclu : il
n'est exercé que par la suite « en direct » (`AI_LIVE=1`, manuelle, jamais en
CI — ADR-0011).

### Corrections et améliorations post-livraison (après M12)

La feuille de route M0→M12 ci-dessus est livrée et validée. Les éléments
suivants sont intervenus après cette validation, remontés lors d'un test
utilisateur en conditions réelles hors de cet environnement de
développement (Windows) :

- **Enchaînement de leçon (M2)** — marquer une leçon comme terminée n'offrait
  aucun moyen de continuer sur place : il fallait repasser par le tableau de
  bord ou la page du chapitre pour trouver la suite. Un lien « Leçon
  suivante » (ou « Chapitre suivant », ou « Passer l'évaluation de niveau »
  en fin de niveau) apparaît maintenant à côté de la confirmation, résolu
  côté serveur dans l'ordre strict du parcours (commit `b04f976`).
- **Recherche bibliothèque (M7)** — `searchLibrary` échouait
  systématiquement (`syntax error at or near "$1"`, Postgres 42601) sur un
  moteur Prisma Windows, qui envoyait les fragments SQL `WHERE`/`ORDER BY`
  eux-mêmes comme des paramètres liés au lieu de les insérer comme texte SQL
  — confirmé dans les logs du conteneur Postgres de l'utilisateur, jamais
  reproduit sur Linux/macOS malgré un schéma et une version Postgres
  identiques. Corrigé en construisant la requête comme une seule chaîne SQL
  avec des paramètres `$N` gérés à la main (`$queryRawUnsafe`), qui évite
  entièrement l'imbrication de fragments `Prisma.sql` en cause
  (commit `0d77ed0`).
- **Lien externe optionnel (M13, contourne le hors périmètre « aucune
  image »)** — plutôt qu'héberger une image (jamais fait dans ce dépôt, pour
  des raisons de droits, voir ci-dessous), un champ `externalLink` facultatif
  permet de pointer vers une page existante qui présente le lieu/matériau
  (photos incluses), rendu comme un lien clairement sortant. Testé d'abord
  sur les 12 fiches « intérieurs célèbres » (commit `dbb6ae9`), puis étendu à
  12 des 54 fiches bibliothèque — celles où un concept identifiable existe
  réellement (3 styles, 3 essences de bois, 3 pierres, 3 plantes) plutôt que
  les 42 types de produits génériques, qui n'ont pas de page de référence
  unique et légitime (commit `2c95518`). Chaque lien a été vérifié
  individuellement par recherche web, jamais deviné.

---

## Documentation

Lire dans cet ordre :

| #   | Document                                                    | Ce qu'il répond                                                                               |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | [Cahier des charges](docs/01-cahier-des-charges.md)         | Qui, quoi, pourquoi. Personas, user stories, périmètre, exigences non-fonctionnelles, budget. |
| 2   | [Architecture technique](docs/02-architecture-technique.md) | Stack, arborescence, couche IA interchangeable, sécurité, tests, CI/CD, déploiement.          |
| 3   | [Design system & UX](docs/03-design-system-ux.md)           | Tokens, wireframes, parcours, animations, mode sombre, accessibilité.                         |
| 4   | [Modèle de données](docs/04-modele-de-donnees.md)           | Schéma Prisma commenté, diagramme ERD, stratégie relationnel/JSONB.                           |
| 5   | [Feuille de route](docs/05-feuille-de-route.md)             | Découpage M0→M12, critères d'acceptation, estimation, dépendances.                            |
| 6   | [Curriculum pédagogique](docs/06-curriculum-pedagogique.md) | Contenu détaillé des 15 niveaux, méthodes d'apprentissage, format des leçons.                 |
| 7   | [Documentation d'exploitation](docs/07-exploitation.md)     | Déploiement, sauvegardes/restauration, supervision, rollback, réponse à incident.             |
| 8   | [Décisions d'architecture (ADR)](docs/adr/)                 | Le _pourquoi_ de chaque choix technique structurant.                                          |

---

## Stack retenue (résumé)

| Couche              | Choix                                                  | ADR                                                    |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Framework           | Next.js 15 (App Router, RSC) + TypeScript strict       | [ADR-0001](docs/adr/0001-nextjs-app-router.md)         |
| UI                  | Tailwind CSS v4 + shadcn/ui + Motion                   | [ADR-0002](docs/adr/0002-tailwind-shadcn.md)           |
| Données             | PostgreSQL 16 + Prisma                                 | [ADR-0003](docs/adr/0003-postgres-prisma.md)           |
| Auth                | Auth.js v5 (Credentials + OAuth)                       | [ADR-0004](docs/adr/0004-authjs.md)                    |
| IA                  | Port/adaptateur — Anthropic `claude-opus-5` par défaut | [ADR-0005](docs/adr/0005-couche-ia-interchangeable.md) |
| Simulateur 2D/3D    | react-konva (2D) → three.js/R3F (3D, différé)          | [ADR-0006](docs/adr/0006-simulateur-2d-avant-3d.md)    |
| Répétition espacée  | FSRS-6 (`ts-fsrs`, `packages/domain/src/srs`)          | [ADR-0007](docs/adr/0007-fsrs-vs-sm2.md)               |
| Stockage fichiers   | S3-compatible (Cloudflare R2) + URL présignées         | [ADR-0008](docs/adr/0008-stockage-objet-s3.md)         |
| Monorepo            | pnpm workspaces + Turborepo                            | [ADR-0009](docs/adr/0009-monorepo-pnpm-turborepo.md)   |
| Contenu pédagogique | MDX versionné dans Git + frontmatter Zod               | [ADR-0010](docs/adr/0010-contenu-mdx-versionne.md)     |
| Embeddings          | Voyage AI `voyage-3.5` + `pgvector` (RAG)              | [ADR-0013](docs/adr/0013-embeddings-voyage-ai.md)      |

---

## Ce qui fonctionne aujourd'hui

**Identité et profil (M1)**

- Inscription e-mail/mot de passe (Argon2id) et OAuth Google si configuré
- Réinitialisation de mot de passe par lien à usage unique, valable 1 h
- Onboarding en 4 écrans avec diagnostic de positionnement (niveau 1 à 4)
- Coquille applicative : barre latérale desktop, barre inférieure mobile
- Profil : thème clair/sombre/système sans clignotement, objectif hebdomadaire,
  réduction des animations
- Export RGPD au format JSON et suppression de compte avec révocation immédiate
  de toutes les sessions

**Leçons (M2)**

- Contenu MDX versionné (`apps/web/content/`), synchronisé en base par
  `pnpm db:seed` (idempotent, bloquant en CI si invalide)
- 11 types de blocs pédagogiques, 4 leçons réelles du niveau 1 « Découverte »
- Lecteur de leçon avec reprise exacte (« reprise au bloc quitté »), suivi de
  progression passif (`IntersectionObserver`), 100 % clavier
- Carte des 15 niveaux avec règles de déverrouillage réelles

**Exercices et révision (M3)**

- 7 types d'exercices notés (QUIZ_MCQ, QUIZ_TRUE_FALSE, QUIZ_MATCH,
  QUIZ_ORDER, HOTSPOT, PALETTE, MATERIAL_CHOICE), correction immédiate avec
  explication, notée côté serveur uniquement
- Évaluations de fin de niveau (`_evaluation.yaml`) : réussir déverrouille le
  niveau suivant, échouer ne verrouille rien
- Répétition espacée FSRS-6 : file quotidienne (`/revisions`), carte
  retournable et notée entièrement au clavier

**Atelier 2D (M4)**

- Dessiner une pièce (rectangulaire, cotée), poser portes/fenêtres, meubler
  depuis un catalogue de 15 empreintes réalistes — création par saisie
  numérique et boutons, pas seulement à la souris : une pièce complète se
  construit **entièrement au clavier** (`/atelier`)
- Alertes en continu : collisions (test d'axes séparateurs), dégagements
  obstrués, largeur de passage entre portes (plus court chemin le plus large)
- Versions de pièce : enregistrer, dupliquer, renommer, restaurer (toujours
  un ajout, jamais une réécriture), comparateur avant/après au clavier
- Arbre DOM parallèle au canevas (`AccessibleSceneList`) : chaque objet est
  aussi un élément focalisable et décrit en toutes lettres pour un lecteur
  d'écran

**Couche IA (M5)**

- Port `AiProvider` (`packages/ai`) + adaptateur Anthropic (`claude-opus-5`,
  pensée adaptative, cache de prompt système) + adaptateur factice
  déterministe, utilisé par défaut en développement et en CI (`AI_PROVIDER=fake`)
  — tests de contrat identiques sur les deux adaptateurs
- Chat pédagogique en streaming (SSE), panneau contextuel sur chaque leçon
  (`/parcours/.../[lecon]`), historique persisté (`AiConversation`/`AiMessage`)
- Garde-fous à trois niveaux (AI-09) : pré-filtrage des sujets à risque (mur
  porteur, électricité, gaz, amiante, plomb) sans aucun appel IA, cadrage par
  le prompt système, sorties toujours validées par un schéma Zod avec reprise
  puis dégradation propre
- Quotas mensuels vérifiés **avant** chaque appel, coûts et tokens tracés
  après chaque appel — réussi ou non (`AiUsage`) — et tableau
  d'administration réservé aux comptes `ADMIN` (`/administration/ia`)
- Cas pratiques ouverts (OPEN_CASE) : barème visible **avant** de répondre,
  correction IA sur sortie structurée (note, deux points forts, deux axes
  d'amélioration, une règle à réviser) — un exercice réel dans l'évaluation
  du niveau 1

**Analyse photo (M6)**

- Dépôt direct navigateur → bucket S3-compatible (URL présignée, ADR-0008) :
  le serveur ne relaie jamais les octets, vérifie les magic bytes après
  téléchargement, redimensionne à 1568 px et **supprime systématiquement
  l'EXIF** (coordonnées GPS incluses) avant tout stockage durable
- Analyse IA structurée : style détecté, proportions, circulation, lumière,
  problèmes gradués avec repères numérotés positionnés sur l'image et
  justification systématique (« pourquoi ») — une photo hors sujet (paysage,
  etc.) est détectée et signalée poliment, sans analyse inventée
  (`AnalysePhotoSchema`, union discriminée)
- Cache par SHA-256 : réanalyser une image déjà vue ne déclenche aucun appel
  IA, quel que soit l'utilisateur qui l'a téléversée en premier
- Historique des analyses par pièce et passerelle « ouvrir dans l'atelier »
  vers la pièce correspondante, quand elle existe encore

**Bibliothèque (M7)**

- 54 fiches réelles couvrant les 18 catégories (docs/04 §3.8), chacune avec
  description, avantages, inconvénients, budget, entretien, erreurs à éviter
  et attributs spécifiques à sa catégorie — corpus volontairement réduit par
  rapport à la cible de la feuille de route (≥ 300), signalé explicitement
  ci-dessous
- Recherche plein texte française (`tsvector` généré par PostgreSQL, index
  GIN) combinée à des facettes (catégorie, budget, pièce, « sans travaux »)
- Graphe de relations (s'associe / à éviter / alternative moins chère ou plus
  haut de gamme / même famille), cohérence bidirectionnelle vérifiée à la
  synchronisation du contenu — une réciproque manquante fait échouer
  `content:sync`, pas une recherche silencieusement incomplète
- Favoris par fiche, par collection
- Indexation vectorielle (`pgvector`, embeddings Voyage AI, ADR-0013) prête
  pour l'ancrage documentaire du chat IA — le calcul se fait à la
  synchronisation du contenu, pas à la requête

**Générateurs (M8)**

- Génération IA d'un moodboard en un seul appel structuré : palette de 3 à 6
  couleurs (rôle + justification) **et** sélection de fiches bibliothèque
  (matériaux, éclairage, accessoires, végétaux) — l'IA choisit exclusivement
  parmi des candidats réellement trouvés dans `LibraryItem` juste avant
  l'appel (schéma Zod construit dynamiquement avec `z.enum` des slugs
  candidats, ADR implicite : aucune fiche inventée ne peut valider), et répond
  `null` plutôt que de forcer un choix médiocre quand rien ne convient
- Contraste WCAG **recalculé côté serveur**, jamais annoncé par l'IA : chaque
  couleur est comparée à la dominante (`computeContrastChecks`), ratio, seuils
  AA/AAA affichés sur la fiche du moodboard — le nombre montré est le nombre
  calculé, pas une reformulation de ce que le modèle a dit
- Éditeur de moodboard : glisser-déposer libre sur un plateau à coordonnées
  fixes (indépendant du pixel écran, comme l'atelier 2D en cm), plus une
  liste accessible parallèle au même vocabulaire clavier que l'atelier
  (flèches déplacent, R pivote, Suppr retire, Cmd/Ctrl+S enregistre
  explicitement) ; ajout d'une fiche bibliothèque par recherche, export en
  PNG recomposé depuis les mêmes transforms que l'affichage (pas une capture
  d'écran)
- Liste de mobilier dimensionnée par pièce, agrégée par pièce identique
  (« Chaise × 4 », pas quatre lignes), avec lien vers la fiche bibliothèque
  quand `catalogRef` en pointe une réelle

**Progression et gamification (M9)**

- XP crédité une seule fois par gain réel (leçon terminée, exercice réussi la
  première fois, évaluation de niveau réussie la première fois, révision) —
  jamais recrédité en repassant un exercice ou une leçon déjà validée ;
  niveau utilisateur (distinct des 15 niveaux du parcours) dérivé du XP total
  par une courbe quadratique pure, testée indépendamment de tout contenu réel
- Série de jours consécutifs avec gel : un jour manqué est absorbé par un gel
  disponible plutôt que de casser la série, un gel se regagne toutes les
  sept journées de série active. Ancrée sur des dates calendaires UTC
  uniquement — jamais l'horloge locale du serveur ou du navigateur — donc
  invariante au changement de fuseau horaire (test dédié faisant varier
  `process.env.TZ` sur des scénarios incluant une frontière d'année)
- 16 badges réels (jalons, régularité, exploration, maîtrise thématique),
  chacun une règle déclarative (`{type, ...}`) évaluée par une seule fonction
  pure — ajouter un badge n'ajoute jamais de code, seulement une entrée de
  contenu synchronisée comme les niveaux et la bibliothèque
- Temps réel mesuré par heartbeat toutes les 30 s, jamais par la durée depuis
  l'ouverture de l'onglet : le client n'émet un battement que pendant que la
  page est visible et au premier plan (Page Visibility API), et chaque
  battement reçu crédite un montant **fixe** côté serveur — jamais une durée
  calculée côté navigateur, qui pourrait être falsifiée
- Tableau de bord étendu : XP/niveau, série et gels disponibles, objectif
  hebdomadaire (minutes réellement actives cette semaine vs objectif),
  avancement des 15 niveaux, révisions dues, thèmes les plus fragiles
  (dérivés des notes de révision), badges débloqués
- Recommandations personnalisées : réviser le thème le plus fragile, reprendre
  un projet resté sans nouvelle version de pièce depuis deux semaines

**Projet personnel (M10)**

- Projet ancré sur un logement réel (adresse libre, budget global en ordre de
  grandeur) et pièces à état d'avancement suivi (`TO_MEASURE` → `DONE`),
  modifiable depuis l'éditeur de pièce et visible sur la page projet
- Import de plan (image — JPEG/PNG/WebP, voir la note ci-dessous) et calibrage
  par deux points cliqués + une cote réelle connue, précision vérifiée à ±2 %
  par un test dédié (`packages/domain/src/geometry/calibration.test.ts`) ; le
  plan calibré s'affiche ensuite comme repère semi-transparent dans l'atelier
  2D, contre lequel les outils existants (pièce, mobilier) sont utilisés à
  l'échelle exacte
- Galerie de photos par pièce avec note libre, distincte de l'analyse IA (M6)
- Journal de projet (notes, décisions, questions ouvertes, lignes de budget) —
  c'est aussi la seule mémoire du mode « architecte accompagnateur » : une
  contrainte n'est retenue par l'IA que si elle a été journalisée, jamais
  extraite automatiquement d'une conversation passée
- Mode « architecte accompagnateur » : le chat IA (M5) s'ancre sur un projet
  plutôt qu'une leçon, avec un prompt système dédié et le journal + les pièces
  du projet injectés en contexte à chaque message — mêmes garde-fous
  (sujets à risque, ordre de grandeur budgétaire) que le chat pédagogique
- Export dossier PDF (`pdf-lib`) : adresse et budget, plan et photos par
  pièce, liste de mobilier dimensionnée, moodboards redessinés depuis les
  mêmes données de transform que l'éditeur (pas une capture d'écran) et
  journal complet
- Versions et comparateur avant/après : déjà livrés en M4, aucun travail
  supplémentaire nécessaire pour ce module

**Contenu des 15 niveaux (M11)**

- Schémas de contenu transverse (`FamousInteriorFrontmatterSchema`,
  `MilestoneProjectFrontmatterSchema`, `ChallengeFrontmatterSchema`) et
  pipeline de synchronisation étendu (`scanFamousInteriors`,
  `scanMilestoneProjects`, `scanChallenges`), même séparation scan pur / sync
  Prisma que le reste du contenu (ADR-0010)
- Niveau 1 « Découverte » complété (6 leçons, 8 exercices d'évaluation) et
  niveau 2 « Fondamentaux » livré en entier (2 chapitres, 7 leçons, 7
  exercices d'évaluation)
- 12 fiches d'intérieurs célèbres (Villa Savoye, maison Farnsworth,
  Fallingwater, casa Luis Barragán, maison de verre, villa Tugendhat,
  Case Study House n° 8, villa Müller, maison Louis Carré, couvent de la
  Tourette, maison Gehry, intérieur haussmannien type) — texte uniquement
  (contexte, intention de conception, lumière, matières, circulation, points
  à retenir), sans illustration hébergée par l'app, même choix que la
  bibliothèque (M7) ; chacune pointe désormais vers un lien externe vérifié
  (M13, voir plus haut)
- Projet jalon A (« Réaménager une pièce simple sur plan ») : contenu pur
  (brief, livrables, critères d'évaluation) qui s'appuie sur l'atelier (M4),
  les générateurs (M8) et le projet personnel (M10) déjà livrés — aucune
  nouvelle mécanique de suivi ajoutée
- 6 défis hebdomadaires, corrigés par IA avec le même barème et le même
  ordre de vérifications (garde-fou → quota → appel IA) que les cas ouverts
  (M5), mais persistés sur un modèle dédié (`Challenge`/`ChallengeSubmission`)
  plutôt que réutiliser `Exercise` : un défi n'a ni `lessonId` ni
  `assessmentId`, et les contraintes d'unicité de `Exercise` reposent sur ces
  deux champs
- Interface : trois nouvelles sections dans la navigation principale
  (intérieurs célèbres, projets jalons, défis), qui remplacent l'entrée
  « Projets » restée bloquée depuis M10 (`comingIn: "M10"` jamais résolu,
  aucune route `/projets` n'ayant jamais existé)

**Finitions et mise en production (M12)**

- CSP stricte avec nonce par requête et `strict-dynamic` (`src/middleware.ts`)
  plus HSTS, en complément des en-têtes statiques déjà posés — vérifiée sans
  violation silencieuse sur le parcours principal (nouveau test dédié) ;
  `style-src-attr 'unsafe-inline'` reste nécessaire pour les éditeurs (atelier
  2D, moodboard) qui positionnent des éléments par attribut `style` en ligne,
  seul cas que CSP niveau 3 n'autorise par aucun mécanisme de nonce ou de hash
- Audit accessibilité approfondi au-delà de l'axe-core déjà en place : un
  vrai défaut trouvé et corrigé — le lien d'évitement changeait l'URL mais ne
  déplaçait jamais le focus clavier réel (`tabIndex={-1}` seul s'est révélé
  insuffisant en pratique ; corrigé par un composant `SkipLink` qui déplace le
  focus explicitement) — plus un premier passage d'audit à résolution mobile
- Budgets de performance réels (`pnpm perf:budgets`) : Lighthouse en
  émulation mobile, session authentifiée créée via un vrai compte, médiane de
  3 mesures sur les pages bloquantes (tableau de bord, lecteur de leçon) pour
  absorber le bruit de mesure — applique les seuils LCP < 2,5 s / TBT < 200 ms
  (proxy de laboratoire pour l'INP) de docs/01 §4, wiré en CI
- Supervision Sentry + OpenTelemetry (`@sentry/nextjs`, `@vercel/otel`),
  strictement no-op sans `SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT` — un
  import statique du SDK client avait gonflé le JS partagé de +84 ko
  (suffisant pour faire échouer les budgets qui venaient d'être posés),
  corrigé par un import dynamique jamais résolu sans DSN
- Sauvegardes et restauration réelles (`packages/db/scripts/backup.sh`/
  `restore.sh`, `pg_dump`/`pg_restore`) — testées en conditions réelles lors
  de cette livraison : sauvegarde de la base réelle, destruction complète du
  schéma, restauration, vérification exacte des comptages et d'un
  enregistrement précis
- Trois pages légales publiques réelles (politique de confidentialité, CGU,
  déclaration d'accessibilité), grounded dans le comportement effectif de
  l'app, avec les informations d'identité de l'éditeur explicitement
  marquées comme restant à compléter avant un lancement réel
- Consentement explicite au premier envoi d'une photo au fournisseur IA
  (`Profile.photoAiConsentAt`), vérifié côté serveur avant tout appel — y
  compris avant le cache SHA-256, puisqu'une analyse servie depuis le cache
  reste une analyse IA de cette photo du point de vue de l'apprenant
- Documentation d'exploitation réelle (`docs/07-exploitation.md`) :
  déploiement, sauvegardes/restauration, supervision, rollback, seuils
  d'alerte, rotation de secrets

**Hors périmètre pour l'instant** (modules à venir, ou explicitement différés
au sein de M7/M8/M9/M10/M11/M12) :

- **Corpus de badges partiel** : 16 badges réels contre l'estimation « ~30 »
  de docs/04 §7 (volumétrie) — le mécanisme (schéma de critères, évaluation,
  synchronisation) est complet ; la liste s'enrichit au fil des modules
  suivants, chaque nouvelle fonctionnalité pouvant justifier un nouveau jalon,
  même logique de corpus honnêtement partiel que la bibliothèque (M7)
- **Corpus bibliothèque incomplet** : 54 fiches contre ≥ 300 visées par
  docs/05 M7 — le pipeline (schéma, recherche, facettes, relations,
  embeddings) est complet et testé à l'échelle visée (recherche vérifiée
  < 150 ms sur 300 fiches via un complément synthétique non commité), mais la
  rédaction du corpus complet reste un travail de contenu à poursuivre,
  comparable à ce que M11 fait pour les leçons
- **Ancrage documentaire (RAG) du chat** : l'index vectoriel existe et est
  interrogeable, mais n'est pas encore branché sur le prompt système du chat
  IA (M5) — une extension distincte, pas incluse dans les tâches listées pour
  M7 dans docs/05
- **Images de moodboard** : `LibraryItem.imageAssetId` n'est rempli par
  aucune fiche à ce stade (docs/04 §3.8, pipeline de curation visuelle hors
  périmètre) — les éléments sans image s'affichent avec leur libellé, dans
  l'éditeur, à l'export PNG (M8) et dans le dossier PDF (M10). Distinct du
  lien externe (M13, `externalLink`) : ce dernier pointe vers une page qui
  présente le matériau, il ne remplace pas une vraie image dans l'éditeur
- **Import de plan en PDF** : volontairement limité aux images (JPEG/PNG/WebP,
  M10) — le `sharp`/libvips de cet environnement n'a pas de lecture PDF, et
  une dépendance native supplémentaire (`canvas`, pour `pdfjs-dist`) a été
  jugée trop fragile pour cette livraison ; un plan en PDF doit d'abord être
  exporté en image avant import (voir la note en tête de `schema.prisma`)
- **Corpus de contenu M11 très partiel** : la cible de docs/06 §5 est
  15 niveaux / ~45 chapitres / ~92 leçons / ~350 exercices / ~450 cartes /
  ~45 cas pratiques IA / 4 projets jalons / 24 défis ; cette livraison couvre
  2/15 niveaux, 3/~45 chapitres, 13/~92 leçons, 38/~350 exercices, 29/~450
  cartes, 1/4 projets jalons et 6/24 défis. Le mécanisme complet (schémas,
  migration, pipeline de synchronisation, pages, correction IA) est en place
  et testé — seule la rédaction du corpus restant est différée, même logique
  que la bibliothèque (M7) et les badges (M9). Les 12 intérieurs célèbres
  sont en revanche complets (12/12, docs/06 §4.2)
- **Audit accessibilité manuel avec lecteur d'écran** : docs/05 M12 vise un
  audit clavier **et** lecteur d'écran ; ce qui a été livré est un audit
  clavier réel (parcours automatisés existants + un nouveau test dédié qui a
  trouvé et corrigé un vrai défaut sur le lien d'évitement) et l'axe-core
  habituel, mais aucun test avec un lecteur d'écran réel (NVDA, JAWS,
  VoiceOver) ni avec des utilisateurs en situation de handicap n'a été mené
  — honnêtement déclaré dans `/accessibilite`, pas seulement ici
- **Identité juridique de l'éditeur** : les trois pages légales (M12) sont
  réelles et grounded dans le comportement effectif de l'app, mais marquent
  explicitement `[À COMPLÉTER]` là où seule une vraie raison sociale (nom,
  adresse, SIRET, juridiction) peut aller — ce dépôt de démonstration n'a
  pas d'identité juridique propre
- **Supervision sans compte réel** : Sentry et OpenTelemetry sont câblés et
  vérifiés no-op sans configuration (aucun appel réseau, aucun poids de
  bundle ajouté), mais aucun compte Sentry ni collecteur OTLP réel n'est
  fourni avec ce dépôt — à brancher via les variables documentées dans
  `docs/07-exploitation.md` §5
- **Planification des sauvegardes** : les scripts (`pnpm db:backup`/
  `db:restore`) sont réels, testés en conditions réelles (sauvegarde →
  destruction complète du schéma → restauration → vérification exacte), mais
  leur exécution automatique quotidienne (cron ou équivalent) dépend d'une
  infrastructure de production pas encore choisie pour ce dépôt

## Démarrage

```bash
pnpm install
cp .env.example .env                  # renseigner DATABASE_URL et AUTH_SECRET
openssl rand -base64 32               # valeur pour AUTH_SECRET
pnpm docker:up                        # PostgreSQL + MinIO
pnpm db:migrate && pnpm db:seed       # compte de démo : demo@atelier.local / atelier-demo-2026
pnpm dev                              # http://localhost:3000
```

`pnpm db:seed` enchaîne le seed de base **et** la synchronisation du contenu
pédagogique (`content:sync`) : les leçons, exercices, cartes et évaluations
du niveau 1 sont publiés automatiquement.

Le fichier `.env` vit **à la racine** du dépôt (source unique) ; les scripts le
chargent via `dotenv-cli`. Sans configuration d'e-mail, les liens de
réinitialisation s'affichent directement dans la console.

### Vérifier

```bash
pnpm lint && pnpm typecheck && pnpm test   # rapide, sans base de données
pnpm build && pnpm e2e                     # nécessite PostgreSQL
```

## Licence

Projet personnel. Contenu pédagogique rédigé pour ce projet ; aucune
reproduction d'ouvrage sous droits. Voir
[Cahier des charges §9](docs/01-cahier-des-charges.md#9-conformité-juridique).
