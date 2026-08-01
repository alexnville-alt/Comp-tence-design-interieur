import { z } from "zod";

/**
 * Validation des variables d'environnement.
 *
 * Principe : échouer vite et bruyamment. Une variable manquante doit empêcher
 * le serveur de démarrer, avec un message qui dit laquelle et pourquoi — pas
 * produire une erreur `undefined is not a function` trois écrans plus loin, en
 * production, un dimanche.
 *
 * ⚠️ Nuance importante : « vite » signifie **au démarrage du serveur**, pas à
 * la compilation. Un `next build` n'a besoin d'aucun secret de production —
 * exiger `AUTH_SECRET` ou `DATABASE_URL` pour construire une image Docker
 * obligerait à injecter des secrets réels dans le pipeline de compilation, ce
 * qui est exactement ce qu'on cherche à éviter. Pendant la phase de build, la
 * validation est donc relâchée ; la vérification stricte a lieu dans
 * `instrumentation.ts`, exécuté au démarrage du serveur.
 *
 * Ce module est **serveur uniquement**. Les secrets ne doivent jamais franchir
 * la frontière du client ; seules les variables préfixées `NEXT_PUBLIC_` le
 * peuvent, et nous n'en avons aucune.
 */

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL est requis (voir .env.example)")
      .refine(
        (url) => url.startsWith("postgres://") || url.startsWith("postgresql://"),
        "DATABASE_URL doit être une URL PostgreSQL",
      ),

    AUTH_SECRET: z
      .string()
      .min(
        32,
        "AUTH_SECRET doit faire au moins 32 caractères — générez-le avec : openssl rand -base64 32",
      ),
    AUTH_URL: z.string().url().optional(),
    APP_URL: z.string().url().default("http://localhost:3000"),

    // OAuth Google : facultatif. Le fournisseur n'est enregistré que si les
    // deux variables sont présentes (voir lib/auth/config.ts).
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    MAIL_TRANSPORT: z.enum(["console", "resend"]).default("console"),
    MAIL_FROM: z.string().default("Atelier <bonjour@exemple.fr>"),
    RESEND_API_KEY: z.string().optional(),

    AI_PROVIDER: z.enum(["fake", "anthropic"]).default("fake"),
    ANTHROPIC_API_KEY: z.string().optional(),

    // Stockage objet S3-compatible (ADR-0008, M6) : MinIO en développement,
    // Cloudflare R2 en production. Aucune valeur par défaut — contrairement à
    // AI_PROVIDER, il n'existe pas de mode « sans stockage » pour l'analyse
    // photo une fois M6 livré.
    S3_ENDPOINT: z.string().url("S3_ENDPOINT doit être une URL valide."),
    S3_REGION: z.string().min(1).default("auto"),
    S3_BUCKET: z.string().min(1, "S3_BUCKET est requis."),
    S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID est requis."),
    S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY est requis."),
  })
  // Une paire OAuth incomplète est presque toujours une erreur de configuration
  // silencieuse : le bouton Google apparaît puis échoue au clic.
  .refine(
    (env) => !env.AUTH_GOOGLE_ID === !env.AUTH_GOOGLE_SECRET,
    "AUTH_GOOGLE_ID et AUTH_GOOGLE_SECRET doivent être renseignés ensemble, ou aucun des deux.",
  )
  .refine(
    (env) => env.MAIL_TRANSPORT !== "resend" || Boolean(env.RESEND_API_KEY),
    "RESEND_API_KEY est requis lorsque MAIL_TRANSPORT vaut « resend ».",
  )
  .refine(
    (env) => env.AI_PROVIDER !== "anthropic" || Boolean(env.ANTHROPIC_API_KEY),
    "ANTHROPIC_API_KEY est requis lorsque AI_PROVIDER vaut « anthropic ».",
  );

export type Env = z.infer<typeof schema>;

/**
 * Vrai pendant `next build`, ou lorsqu'on demande explicitement à ignorer la
 * validation (utile pour construire une image sans secrets).
 */
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1";

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(global)"} : ${issue.message}`)
    .join("\n");
}

/**
 * Validation stricte. Lève si la configuration est incomplète.
 * Appelée au démarrage du serveur par `instrumentation.ts`.
 */
export function assertEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  throw new Error(
    `Configuration d'environnement invalide.\n\n${formatIssues(parsed.error)}\n\n` +
      `Copiez .env.example en .env à la racine du dépôt et complétez les valeurs manquantes.\n`,
  );
}

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  if (isBuildPhase) {
    // Phase de compilation : aucun code applicatif ne s'exécute réellement.
    // On fournit des valeurs neutres pour que les modules s'importent, et on
    // laisse `assertEnv()` refuser le démarrage si la configuration est
    // toujours incomplète au lancement du serveur.
    return {
      NODE_ENV: process.env.NODE_ENV ?? "production",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "x".repeat(32),
      APP_URL: process.env.APP_URL ?? "http://localhost:3000",
      MAIL_TRANSPORT: "console",
      MAIL_FROM: process.env.MAIL_FROM ?? "Atelier <bonjour@exemple.fr>",
      AI_PROVIDER: "fake",
      S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      S3_REGION: process.env.S3_REGION ?? "auto",
      S3_BUCKET: process.env.S3_BUCKET ?? "atelier",
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "build",
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "build",
    };
  }

  throw new Error(
    `Configuration d'environnement invalide.\n\n${formatIssues(parsed.error)}\n\n` +
      `Copiez .env.example en .env à la racine du dépôt et complétez les valeurs manquantes.\n`,
  );
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

/** Le fournisseur Google n'est proposé que s'il est effectivement configuré. */
export const hasGoogleOAuth = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
