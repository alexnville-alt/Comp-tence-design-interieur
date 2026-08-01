# ADR-0013 — Embeddings de la bibliothèque : Voyage AI, indexés par pgvector

**Statut** : Accepté · **Date** : 2026-08-01

## Contexte

M7 (bibliothèque) exige une indexation vectorielle des fiches pour l'ancrage
documentaire (RAG, docs/02 §5.5) : retrouver par similarité sémantique les
fiches pertinentes à injecter dans le contexte de l'assistant IA, en
complément de la recherche plein texte. `docs/04-modele-de-donnees.md` §3.8
prévoit déjà la colonne `embedding Unsupported("vector(1536)")` et l'index
HNSW correspondant — reste à décider **qui calcule le vecteur**.

Contrainte de départ : ADR-0005 rend la couche IA interchangeable, mais
**Anthropic ne propose pas d'API d'embeddings** — `AiProvider.complete()` et
`.analyzeImage()` ne peuvent pas être détournés pour ça.

## Options envisagées

| Option                                              | Verdict                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI** (`text-embedding-3-*`)                   | Bonne qualité générale, mais ajoute un troisième fournisseur externe sans lien avec le reste de la stack IA (Anthropic). Écarté par simplicité de facturation.                                                                                                                   |
| **Voyage AI**                                       | Fournisseur d'embeddings **recommandé officiellement par Anthropic** pour les architectures RAG côté Claude ; modèles orientés recherche documentaire (`voyage-3.5`, entrée `document`/`query` distincte, ce qui améliore la pertinence pour ce cas d'usage précis). **Retenu.** |
| **Modèle local** (`sentence-transformers` via ONNX) | Aucun appel réseau, gratuit à l'usage. Écarté : ajoute une dépendance d'inférence lourde (modèle binaire, runtime ONNX) au déploiement serveur pour un gain marginal à l'échelle de la bibliothèque (quelques centaines de fiches, réindexées rarement).                         |

## Décision

**Voyage AI**, modèle `voyage-3.5`, dimension de sortie fixée à **1024**
(`output_dimension`, paramétrable chez Voyage — 1024 est le meilleur
compromis qualité/coût de stockage pour ce volume). La colonne
`LibraryItem.embedding` est donc `vector(1024)`, pas `vector(1536)` comme
l'illustrait docs/04 §3.8 (chiffre indicatif écrit avant ce choix de
fournisseur) — corrigé dans le schéma et dans ce document pour éviter toute
ambiguïté future.

**Où ça vit** : une méthode `embed()` ajoutée au port `AiProvider`
(`packages/ai/src/port.ts`), au même titre que `complete()`/`analyzeImage()`
— ce n'est pas du texte de chat, mais c'est toujours « une capacité IA
substituable », et ça garde un seul point d'entrée pour tout ce qui appelle
un fournisseur externe. Deux adaptateurs, même principe qu'ADR-0005 :

- `adapters/voyage.ts` — appel réel à l'API Voyage. Comme l'adaptateur
  Anthropic, **jamais exercé en CI** (ADR-0011) : pas de clé API en
  intégration continue, coût et dépendance réseau à éviter sur chaque push.
- `adapters/fake.ts` — vecteur déterministe dérivé d'un hachage du texte
  (même entrée → même vecteur, entrées différentes → vecteurs différents),
  utilisé par défaut en développement et en CI (`AI_PROVIDER=fake`).
  Suffisant pour tester la mécanique de bout en bout (stockage, requête de
  similarité, tri par distance) sans dépendre de la qualité sémantique réelle
  d'un vrai modèle.

**Stockage** : PostgreSQL + `pgvector` (extension native, pas de service
tiers façon Pinecone) — cohérent avec le choix déjà fait pour la recherche
plein texte (`tsvector`), même base de données pour les deux mécanismes de
recherche de la bibliothèque. Index HNSW (`vector_cosine_ops`), calculé à
l'écriture (`content:sync`), jamais à la volée.

## Conséquences

**Positives** — un seul fournisseur d'embeddings à gérer ; recommandation
officielle d'Anthropic, donc cohérence naturelle avec le choix de Claude pour
le reste de l'IA (ADR-0005) ; le calcul se fait une fois par fiche à la
synchronisation du contenu, jamais à la requête utilisateur (latence de
recherche indépendante de la disponibilité de Voyage).

**Négatives** — deuxième fournisseur externe facturé (en plus d'Anthropic) ;
`content:sync` devient dépendant du réseau et d'une clé API dès qu'on veut
regénérer les embeddings — en développement et CI, l'adaptateur factice
retire cette dépendance, au prix de vecteurs sans valeur sémantique réelle
(la recherche par similarité n'est donc **vérifiable qu'en mécanique**, pas
en pertinence, hors exécution manuelle `AI_LIVE=1`).

**Risque résiduel** — si Voyage change la dimension par défaut d'un modèle
ou déprécie `voyage-3.5`, tous les embeddings stockés doivent être
recalculés (`content:sync` est idempotent et rejouable en entier, donc
mécaniquement simple, mais correspond à autant d'appels payants que de
fiches).

## Réversibilité

**Moyenne.** Changer de fournisseur d'embeddings implique de recalculer tout
le corpus (les vecteurs de deux modèles différents ne sont pas comparables
entre eux) et, si la dimension change, une migration Prisma sur la colonne
`vector(n)`. Le port `AiProvider.embed()` lui-même ne change pas — seul
l'adaptateur et la constante de dimension sont à toucher.
