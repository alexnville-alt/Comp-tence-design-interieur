# ADR-0007 — FSRS-6 plutôt que SM-2 pour la répétition espacée

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Le parcours comporte beaucoup de connaissances factuelles qu'il faut réellement
mémoriser, pas simplement lire : hauteurs standard (plan de travail 90 cm,
table 75 cm, assise 45 cm), températures de couleur par usage, entretien des
matériaux, largeurs de circulation, ordre des corps de métier.

Sans révision planifiée, ces notions sont oubliées en quelques semaines — et
l'apprenant se retrouve à rouvrir une leçon en plein magasin. La répétition
espacée est donc une fonctionnalité centrale, pas un bonus.

## Options envisagées

| Option                                      | Avantages                                                                                                                                                                                                             | Inconvénients                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Intervalles fixes** (1 j, 3 j, 7 j, 21 j) | Trivial à implémenter                                                                                                                                                                                                 | Ignore la difficulté réelle de chaque carte : on révise trop ce qu'on sait, pas assez ce qu'on rate |
| **SM-2** (algorithme d'Anki historique)     | Très documenté, simple                                                                                                                                                                                                | Conçu en 1987 ; le facteur de facilité est grossier ; sur-révise notoirement                        |
| **FSRS-6**                                  | Modèle à deux paramètres (stabilité, difficulté) calibré sur des centaines de millions de révisions réelles ; 20 à 30 % de révisions en moins à rétention égale ; permet de cibler une rétention explicite (ex. 90 %) | Plus complexe ; l'optimisation des paramètres par utilisateur demande du volume                     |
| **Service tiers**                           | Rien à écrire                                                                                                                                                                                                         | Données d'apprentissage hors de notre base ; couplage fort ; coût                                   |

## Décision

**FSRS-6**, implémenté dans `packages/domain/srs` en s'appuyant sur `ts-fsrs`,
avec les paramètres par défaut de l'algorithme et une rétention cible de 90 %.

Le calcul étant une **fonction pure** (état de carte + note → nouvel état), il
vit dans le paquet domaine, sans dépendance à Prisma ni à React. Conséquence
directe : il est testable exhaustivement en millisecondes, et exécutable
côté client pour prévisualiser « prochaine révision dans 4 jours » sans
aller-retour serveur.

Justification du choix : à volume de révision égal, FSRS retient nettement
mieux ; ou, formulé du point de vue utilisateur, **il permet d'obtenir la même
rétention en révisant un quart de temps en moins**. Sur un public qui dispose
de 3 à 5 heures par semaine, ce temps rendu est directement du temps de leçon
ou de projet.

## Conséquences

**Positives** — moins de révisions pour une meilleure rétention ; la file
quotidienne reste courte, ce qui protège la régularité ; l'optimisation des
paramètres par utilisateur reste possible plus tard sans changer le modèle de
données.

**Négatives** — algorithme moins intuitif à expliquer (l'interface montre donc
seulement « prochaine révision dans X jours », jamais les paramètres internes) ;
dépendance à `ts-fsrs`, mitigée par le fait que l'algorithme est publié et
réimplémentable.

**Point d'attention** — la file de révision, requêtée sur
`CardReview(userId, dueAt)`, est la requête la plus fréquente de l'application.
Son index est obligatoire dès la première migration.

## Réversibilité

**Élevée.** L'état stocké (`stability`, `difficulty`, `dueAt`, `reps`,
`lapses`, `state`) est suffisant pour repartir sur un autre algorithme, y
compris SM-2 si un problème apparaissait.
