# ADR-0009 — Monorepo pnpm workspaces + Turborepo

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Le projet comporte une seule application déployée mais plusieurs corps de code
aux natures très différentes : la logique métier pure (FSRS, XP, géométrie), la
couche IA, le schéma de base, les tokens de design, et le contenu pédagogique.

La question n'est pas « faut-il plusieurs dépôts ? » (non, un seul déploiement)
mais « faut-il isoler ces corps de code dans des paquets ? ».

## Options envisagées

| Option | Verdict |
|--------|---------|
| **Une seule application, tout dans `src/`** | Le plus simple au départ. Mais rien n'empêche alors une fonction de géométrie d'importer React ou Prisma, et la frontière disparaît en quelques semaines. Les tests métier deviennent lents parce qu'ils tirent tout l'environnement. |
| **Dépôts séparés + paquets publiés** | Isolation forte, mais versionnage, publication et synchronisation pour un projet à un seul déploiement : coût sans contrepartie. Écarté. |
| **Monorepo pnpm + Turborepo** | Frontières explicites, imports vérifiés par l'outil, cache de tâches. **Retenu.** |

## Décision

**pnpm workspaces + Turborepo**, avec cinq paquets :

| Paquet | Contenu | Peut importer |
|--------|---------|---------------|
| `apps/web` | Next.js | tout |
| `packages/domain` | Règles métier pures | **rien** (hors `zod`) |
| `packages/ai` | Port + adaptateurs + prompts | `domain` |
| `packages/db` | Prisma, migrations, seed | `domain` |
| `packages/ui` | Tokens, composants partagés | — |
| `packages/config` | ESLint, TS, Tailwind partagés | — |

La contrainte réellement structurante est la ligne « `packages/domain` ne peut
rien importer ». Ce n'est pas une convention à respecter par discipline : c'est
vérifié mécaniquement par le graphe de dépendances. Ajouter `import { prisma }`
dans une fonction de géométrie fait échouer la construction.

**Pourquoi cela compte** : la valeur pédagogique du produit repose sur des
règles (« un passage principal fait au moins 90 cm », « l'intervalle suivant
vaut X »). Ces règles doivent être exécutables **des deux côtés** — côté client
pour un retour instantané dans l'atelier, côté serveur pour la critique IA — et
testables sans base ni navigateur. Un paquet isolé est le seul moyen fiable
d'obtenir cela.

**pnpm** plutôt que npm/yarn : magasin adressé par contenu (installations plus
rapides, moins d'espace disque) et surtout `node_modules` strict — un paquet ne
peut pas utiliser une dépendance qu'il n'a pas déclarée, ce qui évite les
dépendances fantômes qui cassent au premier déploiement.

**Turborepo** : cache local et distant des tâches. En pratique, une PR qui ne
touche que du contenu MDX ne relance pas les tests du paquet géométrie.

## Conséquences

**Positives** — frontières garanties par l'outillage ; tests du domaine en
quelques centaines de millisecondes ; CI plus rapide grâce au cache ; on peut
supprimer un module entier sans archéologie.

**Négatives** — configuration initiale plus lourde (M0) ; il faut comprendre le
graphe des dépendances pour ajouter un paquet ; certains outils supposent une
racine unique et demandent un réglage.

## Réversibilité

**Élevée dans le sens de la fusion** (aplatir un monorepo est facile), **faible
dans l'autre sens** — extraire un paquet propre d'un `src/` devenu enchevêtré
coûte beaucoup plus cher. C'est précisément pourquoi la décision est prise
maintenant, en M0, et pas plus tard.
