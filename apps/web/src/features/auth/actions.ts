"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@atelier/db";
import { checkPassword, PASSWORD_ISSUE_MESSAGES } from "@atelier/domain";
import { z } from "zod";

import { signIn, signOut, revokeAllSessions } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { consumeResetToken, createResetToken } from "@/lib/auth/reset-token";
import { mailer } from "@/lib/mail";
import { env } from "@/lib/env";
import { RATE_LIMITS, rateLimit, resetRateLimit } from "@/lib/rate-limit";

export interface ActionState {
  error?: string;
  /** Erreurs par champ, pour un affichage au bon endroit du formulaire. */
  fieldErrors?: Record<string, string>;
  success?: string;
}

/** Adresse cliente, pour la limitation de débit. */
async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? store.get("x-real-ip") ?? "inconnue";
}

const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide.");

// ── Inscription ───────────────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Indiquez votre prénom.").max(80),
  email: emailSchema,
  password: z.string(),
});

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clientIp();
  const limit = rateLimit(
    `signup:${ip}`,
    RATE_LIMITS.signup.limit,
    RATE_LIMITS.signup.windowMs,
  );
  if (!limit.allowed) {
    return {
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  // La même règle qu'à l'affichage côté client — mais c'est celle-ci qui fait
  // autorité : le client peut être contourné (packages/domain, ADR-0009).
  const policy = checkPassword(password, email);
  if (!policy.valid) {
    return {
      fieldErrors: {
        password: policy.issues.map((issue) => PASSWORD_ISSUE_MESSAGES[issue]).join(" "),
      },
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  });

  if (existing) {
    // Message volontairement identique à celui d'un succès côté formulaire ?
    // Non : ici on assume de révéler l'existence du compte, car l'utilisateur
    // a besoin de comprendre pourquoi il ne peut pas s'inscrire. Le compromis
    // est différent de celui de la réinitialisation de mot de passe, où
    // l'énumération est un risque réel et sans contrepartie ergonomique.
    return {
      fieldErrors: {
        email: "Un compte existe déjà avec cette adresse. Connectez-vous.",
      },
    };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      profile: { create: {} },
    },
  });

  // Connexion immédiate : demander à l'utilisateur de ressaisir ses
  // identifiants juste après les avoir choisis est une friction inutile.
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  redirect("/bienvenue");
}

// ── Connexion ─────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Saisissez votre mot de passe."),
});

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { email, password } = parsed.data;
  const ip = await clientIp();

  // Deux seaux aux seuils volontairement très différents — voir le commentaire
  // de RATE_LIMITS : l'e-mail identifie un compte, l'IP n'identifie personne.
  const buckets = [
    { key: `login:${email}`, ...RATE_LIMITS.loginPerEmail },
    { key: `login-ip:${ip}`, ...RATE_LIMITS.loginPerIp },
  ];

  for (const bucket of buckets) {
    const limit = rateLimit(bucket.key, bucket.limit, bucket.windowMs);
    if (!limit.allowed) {
      return {
        error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
      };
    }
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Message unique quelle que soit la cause : distinguer « compte inconnu »
      // de « mot de passe incorrect » permettrait d'énumérer les comptes.
      return { error: "E-mail ou mot de passe incorrect." };
    }
    throw error;
  }

  resetRateLimit(`login:${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { profile: { select: { onboardedAt: true } } },
  });

  redirect(user?.profile?.onboardedAt ? "/tableau-de-bord" : "/bienvenue");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

// ── Réinitialisation de mot de passe ──────────────────────────────────────

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldErrors: { email: "Adresse e-mail invalide." } };
  }

  const email = parsed.data;
  const ip = await clientIp();
  const limit = rateLimit(
    `reset:${ip}`,
    RATE_LIMITS.passwordReset.limit,
    RATE_LIMITS.passwordReset.windowMs,
  );

  // Réponse identique quelle que soit l'issue — y compris en cas de limitation.
  // Toute variation (message, délai) permettrait de savoir si un compte existe.
  const genericSuccess: ActionState = {
    success:
      "Si un compte existe pour cette adresse, un lien de réinitialisation vient " +
      "d'être envoyé. Vérifiez votre boîte de réception.",
  };

  if (!limit.allowed) return genericSuccess;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, deletedAt: true, passwordHash: true },
  });

  // Pas de compte, compte supprimé, ou compte purement OAuth (aucun mot de
  // passe à réinitialiser) : on ne fait rien, mais on répond la même chose.
  if (!user || user.deletedAt || !user.passwordHash) return genericSuccess;

  const token = await createResetToken(user.id);
  const link = `${env.APP_URL}/mot-de-passe/reinitialiser?token=${token}`;

  await mailer.send({
    to: email,
    subject: "Réinitialiser votre mot de passe Atelier",
    text: [
      `Bonjour ${user.name ?? ""},`.trim(),
      "",
      "Vous avez demandé à réinitialiser votre mot de passe.",
      "Ouvrez ce lien — il est valable une heure et ne fonctionne qu'une fois :",
      "",
      link,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail :",
      "votre mot de passe actuel reste valable.",
    ].join("\n"),
  });

  return genericSuccess;
}

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string(),
});

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Lien invalide. Demandez un nouveau lien de réinitialisation." };
  }

  const { token, password } = parsed.data;

  const policy = checkPassword(password);
  if (!policy.valid) {
    return {
      fieldErrors: {
        password: policy.issues.map((issue) => PASSWORD_ISSUE_MESSAGES[issue]).join(" "),
      },
    };
  }

  const userId = await consumeResetToken(token);
  if (!userId) {
    return {
      error:
        "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau depuis " +
        "la page de connexion.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  // Un changement de mot de passe fait souvent suite à une compromission :
  // toutes les sessions existantes doivent tomber immédiatement (ADR-0012).
  await revokeAllSessions(userId);

  redirect("/connexion?reinitialise=1");
}

// ── Utilitaires ───────────────────────────────────────────────────────────

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
}
