import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma partagé.
 *
 * En développement, Next.js recharge les modules à chaque modification. Sans
 * ce singleton, chaque rechargement instancierait un nouveau client et ouvrirait
 * un nouveau pool de connexions — PostgreSQL finit par refuser les connexions
 * après quelques minutes d'édition. On conserve donc l'instance sur l'objet
 * global, qui, lui, survit au rechargement.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export type { PrismaClient };
