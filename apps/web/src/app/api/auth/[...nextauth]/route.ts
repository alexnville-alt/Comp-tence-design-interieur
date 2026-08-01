import { handlers } from "@/lib/auth";

/**
 * Points d'entrée Auth.js (callbacks OAuth, déconnexion, CSRF).
 * La connexion par e-mail/mot de passe passe, elle, par une Server Action —
 * voir features/auth/actions.ts.
 */
export const { GET, POST } = handlers;
