# Décisions d'architecture (ADR)

Un ADR (_Architecture Decision Record_) documente **une** décision structurante :
le contexte, les options envisagées, le choix retenu et ses conséquences —
y compris négatives.

**Pourquoi c'est utile ici** : dans six mois, quand tu voudras faire évoluer
l'application, la question ne sera pas « qu'est-ce que ça fait ? » (le code le
dit) mais « pourquoi est-ce fait comme ça, et puis-je le changer ? ». Un ADR
répond à ça en trois minutes de lecture.

**Format** : contexte → options → décision → conséquences → réversibilité.
Un ADR n'est jamais modifié une fois accepté ; s'il devient faux, on en écrit
un nouveau qui le remplace (`Remplace ADR-XXXX`).

| #                                            | Décision                                        | Statut                                  |
| -------------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| [0001](0001-nextjs-app-router.md)            | Next.js App Router avec React Server Components | Accepté                                 |
| [0002](0002-tailwind-shadcn.md)              | Tailwind CSS v4 + shadcn/ui                     | Accepté                                 |
| [0003](0003-postgres-prisma.md)              | PostgreSQL + Prisma                             | Accepté                                 |
| [0004](0004-authjs.md)                       | Auth.js v5 avec sessions en base                | Accepté                                 |
| [0005](0005-couche-ia-interchangeable.md)    | Couche IA port/adaptateur                       | Accepté                                 |
| [0006](0006-simulateur-2d-avant-3d.md)       | Simulateur 2D en V1, 3D différée                | Accepté                                 |
| [0007](0007-fsrs-vs-sm2.md)                  | FSRS-6 plutôt que SM-2                          | Accepté                                 |
| [0008](0008-stockage-objet-s3.md)            | Stockage objet S3 avec URL présignées           | Accepté                                 |
| [0009](0009-monorepo-pnpm-turborepo.md)      | Monorepo pnpm + Turborepo                       | Accepté                                 |
| [0010](0010-contenu-mdx-versionne.md)        | Contenu pédagogique en MDX versionné            | Accepté                                 |
| [0011](0011-strategie-de-tests.md)           | Stratégie de tests et simulation de l'IA        | Accepté                                 |
| [0012](0012-sessions-jwt-avec-revocation.md) | Sessions JWT avec compteur de révocation        | Accepté — amende [0004](0004-authjs.md) |
| [0013](0013-embeddings-voyage-ai.md)         | Embeddings Voyage AI, indexés par pgvector      | Accepté                                 |
