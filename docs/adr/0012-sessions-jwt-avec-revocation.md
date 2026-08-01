# ADR-0012 — Sessions JWT avec compteur de révocation

**Statut** : Accepté · **Date** : 2026-07-31
**Amende** : [ADR-0004](0004-authjs.md) (la décision « stratégie `database` » est remplacée ; le reste d'ADR-0004 reste valable)

## Contexte

ADR-0004 retenait Auth.js v5 avec des **sessions stockées en base**, pour une
raison précise et toujours valable : pouvoir **révoquer une session
immédiatement**. Le produit stocke des photos du domicile de l'utilisateur ; à
la suppression d'un compte ou au changement d'un mot de passe, laisser un jeton
valide plusieurs jours n'est pas acceptable.

À l'implémentation (M1), une contrainte d'Auth.js apparaît : **le fournisseur
`Credentials` (e-mail + mot de passe) est incompatible avec la stratégie
`database`.** Auth.js impose la stratégie `jwt` dès qu'un fournisseur
`Credentials` est utilisé, et la stratégie est globale — on ne peut pas
combiner OAuth en base et Credentials en JWT dans une même configuration.

Or la connexion par e-mail et mot de passe n'est pas négociable : l'onboarding
ne peut pas exiger un compte Google (AUTH-01).

## Options envisagées

| Option                                                                | Analyse                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Sessions en base + connexion par mot de passe écrite à la main** | On contourne `Credentials` en créant nous-mêmes l'enregistrement `Session` et le cookie, en imitant Auth.js. Techniquement faisable, mais on dépend alors du **format interne** du cookie d'Auth.js : une évolution de la bibliothèque casse silencieusement l'authentification. Écarté : la fragilité porte sur la brique la plus critique. |
| **B. Renoncer au mot de passe, OAuth uniquement**                     | Résout tout, mais impose un compte Google à l'inscription. Contredit AUTH-01 et exclut une partie des utilisateurs. Écarté.                                                                                                                                                                                                                  |
| **C. Abandonner Auth.js et écrire la couche de session**              | ~200 lignes, pleine maîtrise. Mais il faudrait aussi réimplémenter OAuth, la protection CSRF et la liaison de comptes — c'est-à-dire refaire une bibliothèque d'authentification, exactement ce qu'ADR-0004 voulait éviter. Écarté.                                                                                                          |
| **D. Stratégie `jwt` + compteur de révocation en base**               | Conserve Auth.js et le mot de passe, et **restitue la révocation immédiate**, qui était l'objectif réel d'ADR-0004. **Retenu.**                                                                                                                                                                                                              |

## Décision

**Stratégie `jwt`, avec un compteur `User.sessionVersion` vérifié à chaque
requête authentifiée.**

Mécanisme :

1. À l'émission du jeton, la valeur courante de `sessionVersion` y est gravée.
2. À chaque requête, le callback `jwt` relit `sessionVersion` en base et
   compare. En cas d'écart, il renvoie `null` : la session est invalide.
3. Incrémenter `sessionVersion` invalide donc **instantanément tous les jetons
   déjà émis, sur tous les appareils**.

L'incrément est déclenché par : changement de mot de passe, suppression de
compte, et (à venir) une action explicite « déconnecter partout ».

### Ce que cela change, et ce que cela ne change pas

**L'objectif d'ADR-0004 est atteint.** La révocation est immédiate, ce qui
était le seul motif du choix `database`.

**Le coût est identique.** ADR-0004 acceptait « une lecture en base par requête
authentifiée » comme prix de la révocation. Ici, c'est exactement la même
lecture, sur le même index. Aucune régression de performance.

**Un aspect est perdu** : la table `Session` n'est plus alimentée, donc on ne
peut pas afficher « vos appareils connectés » ni révoquer une session
individuelle. Ce n'est pas dans le périmètre V1 ; si le besoin apparaît, il se
traite en ajoutant un identifiant de session dans le jeton et une table de
révocation par identifiant — sans changer de stratégie.

Le modèle `Session` est **conservé dans le schéma** : l'adaptateur Prisma en a
besoin, et son maintien laisse la porte ouverte à un retour aux sessions en
base sans migration destructive.

## Conséquences

**Positives** — connexion par mot de passe et OAuth cohabitent dans une seule
configuration Auth.js ; révocation immédiate conservée ; aucune dépendance au
format interne des cookies de la bibliothèque.

**Négatives** — le jeton contient des données lisibles par qui le possède
(identifiant, rôle) : il ne doit jamais transporter d'information sensible ; le
callback `jwt` devient un point de passage obligé dont la moindre erreur casse
toute l'authentification — il est donc couvert par les tests E2E de M1 ;
`sessionVersion` doit être incrémenté à **chaque** point de révocation futur,
ce qui est facile à oublier (la fonction `revokeAllSessions()` centralise
l'appel, précisément pour rendre l'oubli visible).

**Point de vigilance connexe** — le contenu du jeton n'est pas typé : l'isolation
stricte de pnpm rend `@auth/core/jwt` non résolvable depuis l'application, donc
une augmentation de type y serait sans effet. Les valeurs lues du jeton sont
donc **validées** plutôt que présumées (`toRole()` dans `lib/auth/config.ts`).
C'est de toute façon la bonne posture pour une donnée issue d'un cookie.

## Réversibilité

**Élevée.** Le modèle `Session` existe, l'adaptateur Prisma est déjà en place :
revenir aux sessions en base ne demanderait que de changer `strategy` — le jour
où Auth.js lèvera la contrainte, ou si la connexion par mot de passe disparaît.
