# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Image de production — construction multi-étapes.
#
# Objectifs :
#   • aucun secret nécessaire à la construction (voir apps/web/src/lib/env.ts) ;
#   • image finale minimale : sortie `standalone` de Next.js plutôt que
#     l'intégralité de node_modules ;
#   • exécution sans privilèges.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ── Dépendances ──────────────────────────────────────────────────────────────
FROM base AS deps
# On copie d'abord les seuls manifestes : tant qu'ils ne changent pas, Docker
# réutilise le cache de cette couche, même si le code applicatif a été modifié.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/domain/package.json ./packages/domain/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

# ── Construction ─────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Active la sortie `standalone` (voir apps/web/next.config.ts) : elle n'est
# souhaitable QUE pour l'image, car elle rend `next start` inopérant.
ENV BUILD_STANDALONE=1
# Aucune valeur réelle n'est nécessaire : la validation stricte de
# l'environnement a lieu au démarrage du conteneur, pas ici.
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @atelier/db generate
RUN pnpm --filter @atelier/web build

# ── Exécution ────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utilisateur non privilégié : une faille d'exécution de code ne doit pas
# donner les droits root dans le conteneur.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Le client Prisma et les migrations sont nécessaires à l'exécution
# (`migrate deploy` est lancé au déploiement, hors du conteneur applicatif).
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
