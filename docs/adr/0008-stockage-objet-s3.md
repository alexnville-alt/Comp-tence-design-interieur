# ADR-0008 — Stockage objet S3-compatible avec URL présignées

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

L'application stocke des photos d'intérieur, des plans importés, des aperçus de
scènes et des moodboards exportés. Volume estimé : 20 à 60 fichiers par
utilisateur actif, 1 à 12 Mo chacun.

**Ces fichiers sont des données personnelles sensibles** : ce sont des
photographies de l'intérieur du domicile de l'utilisateur, avec parfois des
métadonnées GPS. Une fuite ne serait pas un incident technique mineur mais une
atteinte grave à la vie privée.

## Options envisagées

| Option                                               | Verdict                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stocker en base (`bytea`)**                        | Simple à sauvegarder, mais fait exploser la taille de la base et les temps de restauration ; PostgreSQL n'est pas un serveur de fichiers. Écarté.                  |
| **Système de fichiers local**                        | Empêche tout déploiement multi-instance et impose une gestion manuelle des sauvegardes. Écarté.                                                                    |
| **Service d'images tiers** (Cloudinary, Uploadthing) | Transformations d'images incluses, mais coût au volume et surtout des photos de domicile confiées à un acteur supplémentaire. Écarté par principe de minimisation. |
| **S3-compatible, bucket privé**                      | Standard, portable, peu coûteux, contrôle total des accès. **Retenu.**                                                                                             |

## Décision

**Stockage objet S3-compatible** : Cloudflare R2 en production (pas de frais de
sortie), MinIO en développement local. Bucket **entièrement privé**, aucun
accès public.

Le flux de téléversement :

```
1. Client  → serveur : « je veux téléverser, type image/jpeg, 4,2 Mo »
2. Serveur : vérifie la session, le quota, le type et la taille
3. Serveur → client : URL présignée valable 5 minutes
4. Client  → S3 : téléversement direct (le serveur ne relaie pas les octets)
5. Client  → serveur : confirmation → création de l'enregistrement Asset
6. Serveur : télécharge, vérifie les magic bytes, supprime l'EXIF,
             redimensionne (≤ 1568 px pour l'IA), calcule le SHA-256, réécrit
```

Le flux de lecture : jamais d'URL directe. Une route serveur vérifie que la
ressource appartient à l'utilisateur, puis émet une URL présignée de lecture
valable 10 minutes.

**Suppression de l'EXIF** : obligatoire et non configurable. Une photo prise au
téléphone contient les coordonnées GPS du domicile. Ces métadonnées sont
retirées **avant** tout stockage durable et avant tout envoi au fournisseur
d'IA.

**SHA-256** : sert à la déduplication et au cache d'analyse photo — réanalyser
la même image ne coûte rien.

## Conséquences

**Positives** — les octets ne transitent pas par le serveur applicatif ;
aucune URL d'objet n'est devinable ou indexable ; migration entre fournisseurs
S3 triviale ; coûts prévisibles.

**Négatives** — flux de téléversement en plusieurs étapes à écrire et à
tester ; les URL présignées expirent, donc le client doit savoir en redemander
une ; sauvegardes à gérer séparément de la base.

**Risque résiduel** — une URL présignée reste valide jusqu'à expiration même si
elle est partagée. Durée volontairement courte (10 min en lecture) pour limiter
la fenêtre.

## Réversibilité

**Élevée.** L'API S3 est un standard de fait ; la table `Asset` ne stocke
qu'une `storageKey`, jamais une URL complète — changer de fournisseur revient à
copier les objets et à modifier une variable d'environnement.
