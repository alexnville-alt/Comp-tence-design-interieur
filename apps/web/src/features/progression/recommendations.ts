import { prisma } from "@atelier/db";
import { getWeakTopics } from "./data";

/**
 * Recommandations personnalisées (docs/05 M9, PROG-07) : réviser un thème
 * faible, reprendre un projet abandonné. Chaque source est indépendante —
 * l'absence de signal pour l'une (pas encore de révisions, aucun projet
 * inactif) ne bloque jamais l'autre.
 */

export interface Recommendation {
  label: string;
  href: string;
}

/** Un projet actif sans nouvelle version de pièce depuis ce délai est considéré abandonné. */
const ABANDONED_AFTER_DAYS = 14;

async function getAbandonedProject(
  userId: string,
): Promise<{ id: string; name: string; daysInactive: number } | null> {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const projects = await prisma.project.findMany({
    // DRAFT et ACTIVE seulement — COMPLETED/ARCHIVED est une fin assumée, pas
    // un abandon. En pratique, tout projet créé aujourd'hui reste DRAFT :
    // rien dans l'atelier ne fait encore passer un projet à ACTIVE (aucune
    // interface de statut avant M10) — se limiter à `status: "ACTIVE"`
    // rendrait cette recommandation silencieusement morte.
    where: { userId, status: { in: ["DRAFT", "ACTIVE"] } },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      rooms: { select: { versions: { select: { createdAt: true } } } },
    },
  });

  let stalest: { id: string; name: string; lastActivity: Date } | null = null;
  for (const project of projects) {
    const versionDates = project.rooms.flatMap((room) =>
      room.versions.map((v) => v.createdAt),
    );
    // La pièce (via ses versions) reflète l'activité réelle mieux que
    // `Project.updatedAt`, qui ne bouge que si le projet lui-même change
    // (nom, statut) — jamais quand on continue simplement à meubler une pièce.
    const lastActivity =
      versionDates.length > 0
        ? versionDates.reduce((a, b) => (a > b ? a : b))
        : project.updatedAt;
    if (lastActivity > cutoff) continue;
    if (!stalest || lastActivity < stalest.lastActivity) {
      stalest = { id: project.id, name: project.name, lastActivity };
    }
  }

  if (!stalest) return null;
  const daysInactive = Math.floor(
    (Date.now() - stalest.lastActivity.getTime()) / (24 * 60 * 60 * 1000),
  );
  return { id: stalest.id, name: stalest.name, daysInactive };
}

export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  const [weakTopics, abandonedProject] = await Promise.all([
    getWeakTopics(userId, 1),
    getAbandonedProject(userId),
  ]);

  const recommendations: Recommendation[] = [];
  const weakest = weakTopics[0];
  if (weakest) {
    recommendations.push({
      label: `Réviser « ${weakest.topic} » — votre thème le plus fragile en ce moment`,
      href: "/revisions",
    });
  }
  if (abandonedProject) {
    recommendations.push({
      label: `Reprendre « ${abandonedProject.name} » — sans activité depuis ${abandonedProject.daysInactive} j`,
      href: `/atelier/${abandonedProject.id}`,
    });
  }
  return recommendations;
}
