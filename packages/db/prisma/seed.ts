/**
 * Seed de développement.
 *
 * Idempotent : chaque enregistrement est créé par `upsert` sur une clé
 * naturelle. On peut donc le rejouer autant de fois que nécessaire sans
 * dupliquer quoi que ce soit — c'est ce qui en fera aussi, à partir de M2,
 * le mécanisme de publication du contenu pédagogique (ADR-0010).
 *
 * En M1 il ne crée qu'un compte de démonstration, et uniquement hors production.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

// Paramètres OWASP 2024 pour Argon2id — dupliqués depuis apps/web/src/lib/auth
// afin que le seed reste exécutable sans dépendre de l'application.
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2, // Argon2id
} as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.warn("Seed ignoré : NODE_ENV=production.");
    return;
  }

  const email = "demo@atelier.local";
  const passwordHash = await hash("atelier-demo-2026", ARGON2_OPTIONS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Alex Démo",
      emailVerified: new Date(),
      passwordHash,
      profile: {
        create: {
          goal: "WHOLE_HOME",
          housingType: "HOUSE",
          weeklyMinutes: 300,
          startingLevel: 1,
          onboardedAt: new Date(),
        },
      },
    },
  });

  console.warn(`✓ Compte de démonstration : ${user.email} / atelier-demo-2026`);
}

main()
  .catch((error: unknown) => {
    console.error("Échec du seed :", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
