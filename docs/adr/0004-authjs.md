# ADR-0004 — Auth.js v5 avec sessions en base de données

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Besoins : e-mail + mot de passe (l'utilisateur peut ne pas vouloir lier un
compte Google), OAuth Google, réinitialisation de mot de passe, révocation
immédiate de session (suppression de compte RGPD), et rattachement de données
sensibles — les photos de son domicile.

## Options envisagées

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **Clerk / WorkOS** | Mise en route quasi immédiate, interface soignée | Coût par utilisateur actif ; données d'identité hors de notre base ; dépendance forte à un tiers pour une brique centrale |
| **Lucia** | Léger, explicite | Le projet a annoncé son arrêt en tant que bibliothèque — mauvais pari long terme |
| **Supabase Auth** | Complet | Impose l'écosystème Supabase alors qu'on gère déjà PostgreSQL |
| **Auth.js v5** | Adaptateur Prisma natif, OAuth + Credentials, sessions en base, gratuit, données chez nous | Documentation v5 encore inégale ; le fournisseur Credentials demande d'écrire soi-même le hachage et la vérification |

## Décision

**Auth.js v5, stratégie de session `database`, adaptateur Prisma.**

La stratégie **base de données plutôt que JWT** est le point important. Un JWT
reste valide jusqu'à son expiration : on ne peut pas le révoquer. Or ce produit
doit pouvoir invalider une session immédiatement en cas de suppression de
compte ou de changement de mot de passe, et les données protégées sont des
photos de domicile. Le coût d'une lecture de session en base est négligeable
devant ce besoin.

Mots de passe hachés en **Argon2id** (paramètres OWASP 2024) plutôt que bcrypt :
résistance supérieure aux attaques matérielles, et pas de limite silencieuse à
72 octets.

## Conséquences

**Positives** — révocation immédiate ; identités et progression dans la même
base (export RGPD trivial) ; aucun coût par utilisateur ; OAuth ajoutable
fournisseur par fournisseur.

**Négatives** — une lecture en base par requête authentifiée (mesurée, ~2 ms
avec index) ; il faut implémenter soi-même le flux de réinitialisation de mot de
passe (jeton à usage unique, expiration 1 h, invalidation des sessions
existantes) ; la vérification d'e-mail est à écrire.

**Sécurité** — cookie `httpOnly` + `Secure` + `SameSite=Lax` ; jetons de
session en clé opaque ; limitation de débit sur connexion et réinitialisation ;
la vérification de session est faite **dans chaque Server Action**, jamais
uniquement dans le composant appelant.

## Réversibilité

**Moyenne.** Migrer vers un fournisseur hébergé imposerait de transférer les
comptes et de gérer une période de double authentification. La direction
inverse (hébergé → Auth.js) serait plus douloureuse encore, ce qui conforte le
choix de partir directement sur une solution auto-hébergée.
