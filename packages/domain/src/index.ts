/**
 * @atelier/domain — règles métier pures.
 *
 * Ce paquet ne doit importer QUE `zod`. Aucune dépendance à React, Prisma,
 * Next.js ou au SDK d'un fournisseur d'IA (ADR-0009). C'est ce qui permet
 * d'exécuter les mêmes règles côté client et côté serveur, et de les tester
 * en quelques centaines de millisecondes sans base ni navigateur.
 */

export * from "./auth/password-policy";
export * from "./onboarding/diagnostic";
export * from "./onboarding/schema";
export * from "./curriculum/levels";
export * from "./curriculum/lesson-content";
