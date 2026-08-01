import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@atelier/db";
import { z } from "zod";

import { env, hasGoogleOAuth } from "@/lib/env";
import { DUMMY_HASH, verifyPassword } from "./password";

type Role = "LEARNER" | "ADMIN";

/**
 * Le contenu du jeton n'est pas typé (voir types/next-auth.d.ts) : on le
 * valide au lieu de lui faire confiance. Toute valeur inattendue retombe sur
 * le rôle le moins privilégié.
 */
function toRole(value: unknown): Role {
  return value === "ADMIN" ? "ADMIN" : "LEARNER";
}

/**
 * Le préfixe `__Secure-` et l'attribut `secure` dépendent du **schéma d'URL**,
 * pas de `NODE_ENV`.
 *
 * Un navigateur rejette purement et simplement un cookie `__Secure-` reçu sur
 * une connexion HTTP. Or un build de production servi en HTTP existe bel et
 * bien : c'est exactement ce que font les tests de bout en bout. Indexer ce
 * choix sur `NODE_ENV` rendrait donc l'authentification intestable sur le
 * binaire qu'on déploie — et masquerait le problème derrière un échec obscur
 * de navigation.
 */
const useSecureCookies = env.APP_URL.startsWith("https://");

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Configuration Auth.js v5.
 *
 * ⚠️ Stratégie `jwt` et non `database` — c'est un écart assumé par rapport à
 * ADR-0004, documenté et justifié dans ADR-0012. En résumé : le fournisseur
 * Credentials d'Auth.js est incompatible avec les sessions en base. La
 * révocation immédiate, qui était le vrai objectif d'ADR-0004, est obtenue
 * autrement, par le compteur `User.sessionVersion` vérifié à chaque requête
 * dans le callback `jwt` ci-dessous.
 */
export const authConfig = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60,
  },

  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },

  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            deletedAt: true,
            sessionVersion: true,
          },
        });

        // Vérification systématique, même sans compte correspondant : sans
        // cela, l'écart de temps de réponse permettrait d'énumérer les comptes
        // (cf. commentaire de DUMMY_HASH).
        const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

        if (!user || !user.passwordHash || user.deletedAt || !valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),

    // N'enregistrer le fournisseur que s'il est réellement configuré : un
    // bouton « Continuer avec Google » qui échoue au clic est pire que son
    // absence.
    ...(hasGoogleOAuth
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID!,
            clientSecret: env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],

  callbacks: {
    /**
     * Empêche la connexion d'un compte supprimé, quel que soit le fournisseur.
     */
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { deletedAt: true },
      });
      return !existing?.deletedAt;
    },

    /**
     * Cœur du mécanisme de révocation (ADR-0012).
     *
     * À l'émission, on grave `sessionVersion` dans le jeton. À chaque requête
     * ultérieure, on le compare à la valeur en base : incrémenter
     * `sessionVersion` (changement de mot de passe, suppression de compte,
     * « déconnecter partout ») invalide donc instantanément tous les jetons
     * déjà émis, sur tous les appareils.
     *
     * Coût : une lecture indexée par requête authentifiée — exactement ce
     * qu'auraient coûté les sessions en base.
     */
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true, role: true },
        });
        token.sub = user.id;
        token.sessionVersion = fresh?.sessionVersion ?? 0;
        token.role = fresh?.role ?? "LEARNER";
        return token;
      }

      if (!token.sub) return null;

      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { sessionVersion: true, role: true, deletedAt: true },
      });

      if (!current || current.deletedAt) return null;
      if (current.sessionVersion !== token.sessionVersion) return null;

      // `trigger === "update"` : appelé après une mise à jour de profil, pour
      // rafraîchir le rôle sans forcer une reconnexion.
      if (trigger === "update") token.role = current.role;

      return token;
    },

    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = toRole(token.role);
      return session;
    },
  },

  events: {
    /**
     * Un compte créé via OAuth n'a pas de profil : on le crée à la volée pour
     * que l'onboarding trouve toujours un enregistrement à compléter.
     */
    async signIn({ user, isNewUser }) {
      if (!isNewUser || !user.id) return;
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    },
  },

  trustHost: true,
  secret: env.AUTH_SECRET,
} satisfies NextAuthConfig;
