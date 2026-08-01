import type { DefaultSession } from "next-auth";

/**
 * Extension des types Auth.js.
 *
 * Sans cette augmentation, `session.user.id` serait `undefined` du point de vue
 * de TypeScript alors qu'il est bien présent à l'exécution — un décalage qui
 * conduit soit à des `!` non sûrs partout, soit à des `any`.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "LEARNER" | "ADMIN";
    } & DefaultSession["user"];
  }
}

/**
 * ⚠️ Volontairement, le type `JWT` n'est PAS augmenté ici.
 *
 * L'interface que TypeScript résout dans les callbacks provient de
 * `@auth/core/jwt`, un paquet transitif que l'isolation stricte de pnpm rend
 * non résolvable depuis cette application. Un `declare module "@auth/core/jwt"`
 * ne l'augmenterait donc pas : il déclarerait un module **fantôme**, sans
 * effet — et, plus grave, il masquerait de vraies erreurs de résolution.
 *
 * On pourrait ajouter `@auth/core` en dépendance explicite pour rendre
 * l'augmentation effective, mais il faudrait alors maintenir sa version
 * alignée sur celle utilisée en interne par `next-auth` : deux versions
 * distinctes donnent deux interfaces distinctes, et l'augmentation
 * redeviendrait silencieusement inopérante.
 *
 * Le contenu du jeton est donc traité comme non typé et **validé** à la
 * lecture (`lib/auth/config.ts`). C'est de toute façon plus sain : ces
 * valeurs proviennent d'un cookie, fût-il signé.
 */

export {};
