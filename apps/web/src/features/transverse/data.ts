import { prisma } from "@atelier/db";

/**
 * Lecture du contenu transverse (docs/06 §4, M11) : intérieurs célèbres,
 * projets jalons, défis hebdomadaires. Les deux premiers sont publics — pas
 * de filtre par utilisateur, comme la bibliothèque (M7). Les défis
 * exposent en plus, pour l'utilisateur courant, sa meilleure soumission
 * (jamais celle d'un autre apprenant).
 */

export interface FamousInteriorSummary {
  slug: string;
  name: string;
  architect: string;
  year: string;
}

export async function listFamousInteriors(): Promise<FamousInteriorSummary[]> {
  const items = await prisma.famousInterior.findMany({
    orderBy: { order: "asc" },
    select: { slug: true, name: true, architect: true, year: true },
  });
  return items;
}

export interface FamousInteriorDetail {
  slug: string;
  name: string;
  architect: string;
  year: string;
  location: string;
  context: string;
  designIntent: string;
  light: string;
  materials: string;
  circulation: string;
  takeaways: string[];
  /** Page externe présentant le lieu (photos, contexte) — jamais hébergé ici. */
  externalLink: string | null;
}

export async function getFamousInterior(
  slug: string,
): Promise<FamousInteriorDetail | null> {
  return prisma.famousInterior.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      architect: true,
      year: true,
      location: true,
      context: true,
      designIntent: true,
      light: true,
      materials: true,
      circulation: true,
      takeaways: true,
      externalLink: true,
    },
  });
}

export interface MilestoneProjectSummary {
  slug: string;
  phase: number;
  title: string;
}

export async function listMilestoneProjects(): Promise<MilestoneProjectSummary[]> {
  return prisma.milestoneProject.findMany({
    orderBy: { phase: "asc" },
    select: { slug: true, phase: true, title: true },
  });
}

export interface MilestoneProjectDetail {
  slug: string;
  phase: number;
  title: string;
  brief: string;
  deliverables: string[];
  evaluationCriteria: string[];
}

export async function getMilestoneProject(
  slug: string,
): Promise<MilestoneProjectDetail | null> {
  return prisma.milestoneProject.findUnique({
    where: { slug },
    select: {
      slug: true,
      phase: true,
      title: true,
      brief: true,
      deliverables: true,
      evaluationCriteria: true,
    },
  });
}

export interface ChallengeSummary {
  id: string;
  slug: string;
  weekIndex: number;
  title: string;
  /** Meilleur score de l'utilisateur courant, `null` si jamais soumis. */
  bestScoreRatio: number | null;
}

export async function listChallenges(userId: string): Promise<ChallengeSummary[]> {
  const challenges = await prisma.challenge.findMany({
    orderBy: { weekIndex: "asc" },
    select: {
      id: true,
      slug: true,
      weekIndex: true,
      title: true,
      submissions: {
        where: { userId },
        orderBy: { scoreRatio: "desc" },
        take: 1,
        select: { scoreRatio: true },
      },
    },
  });
  return challenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    weekIndex: c.weekIndex,
    title: c.title,
    bestScoreRatio: c.submissions[0]?.scoreRatio ?? null,
  }));
}

export interface ChallengeDetail {
  id: string;
  slug: string;
  weekIndex: number;
  title: string;
  scenario: string;
  constraint: string;
  maxScore: number;
  submissions: {
    id: string;
    score: number;
    scoreRatio: number;
    attempt: number;
    createdAt: Date;
    feedback: {
      pointsForts: string[];
      axesAmelioration: string[];
      regleAReviser: string;
    };
  }[];
}

export async function getChallengeDetail(
  userId: string,
  slug: string,
): Promise<ChallengeDetail | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      weekIndex: true,
      title: true,
      scenario: true,
      constraint: true,
      maxScore: true,
      submissions: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          score: true,
          scoreRatio: true,
          attempt: true,
          createdAt: true,
          feedback: true,
        },
      },
    },
  });
  if (!challenge) return null;
  return {
    ...challenge,
    submissions: challenge.submissions.map((s) => ({
      ...s,
      feedback: s.feedback as ChallengeDetail["submissions"][number]["feedback"],
    })),
  };
}
