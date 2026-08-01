# Atelier — Plateforme d'apprentissage du design d'intérieur

> Le « Duolingo du design d'intérieur », combiné à la rigueur d'une école
> d'architecture et aux outils d'un cabinet de décoration.

**Objectif** : amener un débutant complet à un niveau quasi professionnel,
capable de concevoir et rénover lui-même l'intégralité de son habitation.

---

## État du projet

| Phase       | Contenu                                                          | Statut                                   |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------- |
| **Phase 0** | Cahier des charges, architecture, UX, modèle de données, roadmap | ✅ Validée                               |
| **M0 + M1** | Socle technique, authentification, onboarding, profil, RGPD      | ✅ Livrée — **en attente de validation** |
| M2          | Moteur de leçons (MDX, blocs, carte de parcours)                 | ⏸️ Bloquée par validation                |
| M3 → M12    | Voir la feuille de route                                         | ⏸️                                       |

Conformément à la méthodologie demandée, chaque module attend une validation
explicite avant que le suivant ne démarre.

**État de M0 + M1** — 100 tests unitaires, 21 tests de bout en bout (dont
l'audit d'accessibilité axe-core sur 5 écrans, en thème clair et sombre),
lint, types et format vérifiés en intégration continue.

| Vérification                 | Commande            | Résultat                                 |
| ---------------------------- | ------------------- | ---------------------------------------- |
| Tests unitaires              | `pnpm test`         | 100 ✅ (domaine 53 · tokens 33 · app 14) |
| Bout en bout + accessibilité | `pnpm e2e`          | 21 ✅                                    |
| Types (4 paquets)            | `pnpm typecheck`    | ✅                                       |
| Lint (4 paquets)             | `pnpm lint`         | ✅                                       |
| Format                       | `pnpm format:check` | ✅                                       |
| Build de production          | `pnpm build`        | ✅ 12 routes                             |

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

| Couche             | Choix                                                  | ADR                                                    |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| Framework          | Next.js 15 (App Router, RSC) + TypeScript strict       | [ADR-0001](docs/adr/0001-nextjs-app-router.md)         |
| UI                 | Tailwind CSS v4 + shadcn/ui + Motion                   | [ADR-0002](docs/adr/0002-tailwind-shadcn.md)           |
| Données            | PostgreSQL 16 + Prisma                                 | [ADR-0003](docs/adr/0003-postgres-prisma.md)           |
| Auth               | Auth.js v5 (Credentials + OAuth)                       | [ADR-0004](docs/adr/0004-authjs.md)                    |
| IA                 | Port/adaptateur — Anthropic `claude-opus-5` par défaut | [ADR-0005](docs/adr/0005-couche-ia-interchangeable.md) |
| Simulateur 2D/3D   | react-konva (2D) → three.js/R3F (3D, différé)          | [ADR-0006](docs/adr/0006-simulateur-2d-avant-3d.md)    |
| Répétition espacée | FSRS-6                                                 | [ADR-0007](docs/adr/0007-fsrs-vs-sm2.md)               |
| Stockage fichiers  | S3-compatible (Cloudflare R2) + URL présignées         | [ADR-0008](docs/adr/0008-stockage-objet-s3.md)         |
| Monorepo           | pnpm workspaces + Turborepo                            | [ADR-0009](docs/adr/0009-monorepo-pnpm-turborepo.md)   |

---

## Ce qui fonctionne aujourd'hui

- Inscription e-mail/mot de passe (Argon2id) et OAuth Google si configuré
- Réinitialisation de mot de passe par lien à usage unique, valable 1 h
- Onboarding en 4 écrans avec diagnostic de positionnement (niveau 1 à 4)
- Coquille applicative : barre latérale desktop, barre inférieure mobile
- Tableau de bord et carte des 15 niveaux (structure ; leçons en M2)
- Profil : thème clair/sombre/système sans clignotement, objectif hebdomadaire,
  réduction des animations
- Export RGPD au format JSON et suppression de compte avec révocation immédiate
  de toutes les sessions

## Démarrage

```bash
pnpm install
cp .env.example .env                  # renseigner DATABASE_URL et AUTH_SECRET
openssl rand -base64 32               # valeur pour AUTH_SECRET
pnpm docker:up                        # PostgreSQL + MinIO
pnpm db:migrate && pnpm db:seed       # compte de démo : demo@atelier.local / atelier-demo-2026
pnpm dev                              # http://localhost:3000
```

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
