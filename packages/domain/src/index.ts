/**
 * @atelier/domain — règles métier pures.
 *
 * Ce paquet n'importe aucune dépendance à React, Prisma, Next.js ni au SDK
 * d'un fournisseur d'IA (ADR-0009) : seules `zod` et, depuis M3, `ts-fsrs`
 * (ADR-0007 — algorithme pur, zéro dépendance transitive) sont autorisées.
 * C'est ce qui permet d'exécuter les mêmes règles côté client et côté
 * serveur, et de les tester en quelques centaines de millisecondes sans base
 * ni navigateur.
 */

export * from "./auth/password-policy";
export * from "./onboarding/diagnostic";
export * from "./onboarding/schema";
export * from "./curriculum/levels";
export * from "./curriculum/lesson-content";
export * from "./curriculum/assessment";
export * from "./exercises";
export * from "./srs";
export * from "./geometry";
export * from "./ai/guardrails";
