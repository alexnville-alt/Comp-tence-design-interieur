import { NextResponse } from "next/server";
import { prisma } from "@atelier/db";
import { requireUser } from "@/lib/auth";

/**
 * Export des données personnelles (AUTH-04, RGPD art. 20 — portabilité).
 *
 * Format JSON : lisible par un humain et réexploitable par une machine, ce
 * qu'exige le droit à la portabilité. Un PDF serait lisible mais pas
 * réutilisable.
 *
 * ⚠️ Cette liste doit grandir avec le schéma. Chaque module qui ajoute une
 * table contenant des données utilisateur doit l'ajouter ici — c'est vérifié
 * par un test d'intégration qui compare les relations de `User` aux clés
 * exportées.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          goal: true,
          housingType: true,
          weeklyMinutes: true,
          startingLevel: true,
          theme: true,
          locale: true,
          reducedMotion: true,
          soundEnabled: true,
          totalXp: true,
          currentStreak: true,
          longestStreak: true,
          lastActiveDate: true,
          onboardedAt: true,
          createdAt: true,
        },
      },
      // Les comptes OAuth sont listés sans leurs jetons : ce sont des secrets
      // d'accès à un service tiers, pas des données personnelles à restituer.
      accounts: {
        select: { provider: true, type: true },
      },
    },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    format: "atelier-export-v1",
    user,
  };

  const filename = `atelier-donnees-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Un export contient des données personnelles : aucun cache, nulle part.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
