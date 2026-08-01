# ADR-0003 — PostgreSQL 16 + Prisma

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Les besoins de stockage sont hétérogènes :

- **relationnels stricts** : utilisateurs, progression, projets, versions
  (intégrité référentielle indispensable) ;
- **semi-structurés** : scènes du simulateur, attributs de fiches par catégorie,
  résultats d'analyse IA ;
- **recherche plein texte en français** sur la bibliothèque ;
- **recherche vectorielle** pour l'ancrage documentaire de l'IA (RAG).

## Options envisagées

| Option                   | Verdict                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MongoDB**              | Le semi-structuré est natif, mais la progression pédagogique est un graphe relationnel dense (utilisateur × leçon × exercice × carte). Les jointures applicatives seraient un coût permanent. Écarté. |
| **SQLite / Turso**       | Excellent pour démarrer, mais pas de recherche vectorielle mature ni de plein texte français correct. Écarté.                                                                                         |
| **PostgreSQL + Drizzle** | ORM plus fin et plus proche du SQL, très bon. Mais les migrations et l'outillage sont plus artisanaux.                                                                                                |
| **PostgreSQL + Prisma**  | Couvre les quatre besoins avec un seul moteur ; migrations versionnées ; client typé ; `prisma studio` accélère l'inspection quotidienne. **Retenu.**                                                 |

## Décision

**PostgreSQL 16 + Prisma 6.**

PostgreSQL est le seul candidat qui couvre les quatre besoins sans ajouter un
second système : `jsonb` pour le semi-structuré (avec index GIN si nécessaire),
`tsvector` avec le dictionnaire français pour la recherche, et l'extension
`pgvector` pour le RAG. Ajouter Elasticsearch ou une base vectorielle dédiée
pour 300 fiches serait une complexité d'exploitation injustifiée.

Prisma est préféré à Drizzle pour un projet appelé à évoluer par modules : le
flux de migration (`migrate dev` / `migrate deploy`), la génération de types et
`prisma studio` réduisent la friction quotidienne, ce qui compte davantage ici
que le contrôle fin du SQL généré.

## Conséquences

**Positives** — un seul système à exploiter et sauvegarder ; typage de bout en
bout du schéma jusqu'au composant ; migrations relues en pull request comme du
code.

**Négatives** — Prisma génère parfois du SQL sous-optimal sur les requêtes
complexes (atténué par `relationJoins`, et par `$queryRaw` typé pour les rares
cas critiques) ; le client alourdit le démarrage à froid en environnement
serverless (atténué par un singleton et un pool de connexions).

**À surveiller** — la file de révision (`CardReview(userId, dueAt)`) est la
requête la plus fréquente : son plan d'exécution doit être vérifié dès qu'elle
dépasse 100 000 lignes.

## Réversibilité

**Élevée pour PostgreSQL** (standard, portable), **moyenne pour Prisma** :
migrer vers Drizzle demanderait de réécrire la couche d'accès, mais le schéma
SQL et les données resteraient intacts.

## Addendum (M7) — une colonne générée, pas juste `tsvector`

`LibraryItem.searchVector` (docs/04 §3.8) devait rester synchronisée avec
`name`/`summary`/`description`/`pros`/`cons`/`mistakes` sans jamais dépendre
de l'application pour la maintenir à jour — un champ oublié dans une future
Server Action de modification de fiche produirait sinon une recherche
silencieusement désynchronisée du contenu réel. Solution : une colonne
**générée** PostgreSQL (`GENERATED ALWAYS AS (...) STORED`), calculée par la
base elle-même à chaque écriture.

Obstacle trouvé en écrivant la migration, pas prévisible depuis le schéma
Prisma : une colonne générée exige une expression **IMMUTABLE**, et
`to_tsvector('french', …)` n'est que **STABLE** (le nom de configuration est
résolu via le catalogue système, donc théoriquement variable). PostgreSQL
refuse la migration avec `generation expression is not immutable`. Corrigé en
enveloppant l'appel dans une fonction SQL déclarée `IMMUTABLE`
(`library_item_search_vector`, dans la migration
`20260801193309_m7_bibliotheque`) — l'engagement de stabilité est vrai en
pratique ici (la configuration `'french'` est une constante du projet), donc
défendable, mais c'est PostgreSQL qui l'exige explicitement, pas une
formalité gratuite.

Prisma ne modélise ni les colonnes générées ni les index `GIN`/`HNSW` dans son
DSL : `schema.prisma` déclare `searchVector`/`embedding` en
`Unsupported(...)`, et la définition réelle (fonction, génération, index) vit
entièrement dans le SQL de migration, écrit et relu à la main plutôt que
généré par `prisma migrate dev`.
