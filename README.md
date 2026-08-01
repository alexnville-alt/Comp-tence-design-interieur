# Atelier — Plateforme d'apprentissage du design d'intérieur

> Le « Duolingo du design d'intérieur », combiné à la rigueur d'une école
> d'architecture et aux outils d'un cabinet de décoration.

**Objectif** : amener un débutant complet à un niveau quasi professionnel,
capable de concevoir et rénover lui-même l'intégralité de son habitation.

---

## État du projet

| Phase       | Contenu                                                                  | Statut                                   |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| **Phase 0** | Cahier des charges, architecture, UX, modèle de données, roadmap         | ✅ Validée                               |
| **M0**      | Socle technique (monorepo, CI, tokens, Docker)                           | ✅ Livrée                                |
| **M1**      | Authentification, onboarding, profil, RGPD                               | ✅ Livrée                                |
| **M2**      | Moteur de leçons (MDX, 11 blocs, reprise exacte, carte de parcours)      | ✅ Livrée                                |
| **M3**      | Exercices notés, évaluations de fin de niveau, répétition espacée FSRS-6 | ✅ Livrée                                |
| **M4**      | Atelier 2D (plan, mobilier, circulation, versions)                       | ✅ Livrée                                |
| **M5**      | Couche IA : chat, garde-fous, quotas, correction de cas ouverts          | ✅ Livrée                                |
| **M6**      | Analyse photo (dépôt S3, garde-fous, repères, cache SHA-256)             | ✅ Livrée — **en attente de validation** |
| M7 → M12    | Voir la feuille de route                                                 | ⏸️ Bloqué par validation                 |

Conformément à la méthodologie demandée, chaque module attend une validation
explicite avant que le suivant ne démarre. Historique des livraisons : commits
`feat(m0,m1)`, `feat(m2)`, `feat(m3)`, `feat(m4)`, `feat(m5)`, `feat(m6)` sur
la branche `claude/interior-design-learning-platform-bam6l6`.

**État à la fin de M6** — 396 tests unitaires, 40 tests de bout en bout (dont
l'audit d'accessibilité axe-core sur 15 écrans/flux, en thème clair et sombre),
lint, types et format vérifiés en intégration continue.

| Vérification                 | Commande            | Résultat                                      |
| ---------------------------- | ------------------- | --------------------------------------------- |
| Tests unitaires              | `pnpm test`         | 396 ✅ (domaine 216 · IA 55 · app 92 · ui 33) |
| Bout en bout + accessibilité | `pnpm e2e`          | 40 ✅                                         |
| Types (6 paquets)            | `pnpm typecheck`    | ✅                                            |
| Lint (6 paquets)             | `pnpm lint`         | ✅                                            |
| Format                       | `pnpm format:check` | ✅                                            |
| Build de production          | `pnpm build`        | ✅ 22 routes                                  |

Le paquet domaine (`packages/domain`) reste à ~99,6 % de couverture de
lignes — FSRS-6 (`srs/`), la correction d'exercices (`exercises/`), la
géométrie de l'atelier (`geometry/` : collisions SAT, circulation par plus
court chemin le plus large, dégagements) et les garde-fous IA (`ai/`) y sont
testés sans base de données ni navigateur. Le nouveau paquet `packages/ai`
(port `AiProvider`, adaptateur factice, convertisseur Zod → JSON Schema) est
à ~99 % de couverture — l'adaptateur Anthropic lui-même en est exclu : il
n'est exercé que par la suite « en direct » (`AI_LIVE=1`, manuelle, jamais en
CI — ADR-0011).

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
| 7   | [Décisions d'architecture (ADR)](docs/adr/)                 | Le _pourquoi_ de chaque choix technique structurant.                                          |

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

**Hors périmètre pour l'instant** (modules à venir) : ancrage documentaire du
chat sur la bibliothèque — RAG (dépend de `LibraryItem`, M7), bibliothèque de
matériaux/styles (M7), import de plan (`ProjectAsset`, M10),
XP/séries/badges (M9) — les champs `xpReward` existent en base mais ne sont
crédités nulle part avant M9.

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
