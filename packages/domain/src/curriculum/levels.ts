/**
 * Métadonnées des 15 niveaux (doc 06 — curriculum pédagogique).
 *
 * Données pures et statiques : la structure du parcours ne dépend d'aucun
 * utilisateur. Elles servent à trois endroits — la carte de parcours,
 * le seed de la base, et les règles de déverrouillage — qui doivent
 * impérativement partager la même source.
 *
 * ⚠️ En M1, le contenu des leçons n'existe pas encore : ce fichier ne décrit
 * que la charpente. Les chapitres et leçons arrivent en M2 depuis le MDX
 * (ADR-0010).
 */

export interface LevelMeta {
  number: number;
  slug: string;
  title: string;
  summary: string;
  phase: 1 | 2 | 3 | 4;
  estimatedMinutes: number;
  /** Niveau à terminer pour déverrouiller celui-ci (`null` = accessible d'emblée). */
  requiresLevel: number | null;
}

export interface PhaseMeta {
  number: 1 | 2 | 3 | 4;
  title: string;
  /** Le projet jalon qui conclut la phase. */
  milestone: string;
}

export const PHASES: readonly PhaseMeta[] = [
  {
    number: 1,
    title: "Les fondations",
    milestone: "Réaménager une pièce simple sur plan",
  },
  {
    number: 2,
    title: "La matière",
    milestone: "Composition matières et mobilier d'un séjour",
  },
  {
    number: 3,
    title: "Les pièces",
    milestone: "Concevoir une pièce technique complète",
  },
  {
    number: 4,
    title: "Le projet réel",
    milestone: "Dossier complet de votre propre logement",
  },
] as const;

export const LEVELS: readonly LevelMeta[] = [
  {
    number: 1,
    slug: "decouverte",
    title: "Découverte",
    summary: "Savoir regarder un espace et nommer ce qu'on y voit.",
    phase: 1,
    estimatedMinutes: 120,
    requiresLevel: null,
  },
  {
    number: 2,
    slug: "fondamentaux",
    title: "Fondamentaux",
    summary: "Les règles de composition qui rendent un espace juste.",
    phase: 1,
    estimatedMinutes: 180,
    requiresLevel: 1,
  },
  {
    number: 3,
    slug: "couleurs",
    title: "Couleurs",
    summary: "Composer une palette cohérente et anticiper le rendu réel.",
    phase: 1,
    estimatedMinutes: 180,
    requiresLevel: 2,
  },
  {
    number: 4,
    slug: "lumiere",
    title: "Lumière",
    summary: "Concevoir un éclairage à trois couches, naturel et artificiel.",
    phase: 1,
    estimatedMinutes: 180,
    requiresLevel: 3,
  },
  {
    number: 5,
    slug: "mobilier",
    title: "Mobilier",
    summary: "Dimensionner juste et reconnaître la qualité.",
    phase: 2,
    estimatedMinutes: 180,
    requiresLevel: 4,
  },
  {
    number: 6,
    slug: "materiaux",
    title: "Matériaux",
    summary: "Choisir selon usage, budget, entretien et vieillissement.",
    phase: 2,
    estimatedMinutes: 240,
    requiresLevel: 5,
  },
  {
    number: 7,
    slug: "cuisine",
    title: "Cuisine",
    summary: "Implantation, ergonomie, plans de travail, budget.",
    phase: 3,
    estimatedMinutes: 240,
    requiresLevel: 6,
  },
  {
    number: 8,
    slug: "salle-de-bain",
    title: "Salle de bain",
    summary: "Contraintes techniques, implantation, matériaux humides.",
    phase: 3,
    estimatedMinutes: 180,
    requiresLevel: 6,
  },
  {
    number: 9,
    slug: "salon",
    title: "Salon",
    summary: "Assises, tapis, télévision, espaces ouverts.",
    phase: 3,
    estimatedMinutes: 180,
    requiresLevel: 6,
  },
  {
    number: 10,
    slug: "chambre",
    title: "Chambre",
    summary: "Concevoir une pièce reposante et bien rangée.",
    phase: 3,
    estimatedMinutes: 150,
    requiresLevel: 6,
  },
  {
    number: 11,
    slug: "bureau",
    title: "Bureau",
    summary: "Ergonomie, lumière de travail, acoustique.",
    phase: 3,
    estimatedMinutes: 150,
    requiresLevel: 6,
  },
  {
    number: 12,
    slug: "exterieurs",
    title: "Espaces extérieurs",
    summary: "Prolonger l'intérieur : terrasses, mobilier, végétal.",
    phase: 3,
    estimatedMinutes: 150,
    requiresLevel: 6,
  },
  {
    number: 13,
    slug: "architecture-interieure",
    title: "Architecture intérieure",
    summary: "Plans, coupes, perspectives, distribution du logement.",
    phase: 4,
    estimatedMinutes: 240,
    requiresLevel: 12,
  },
  {
    number: 14,
    slug: "renovation",
    title: "Rénovation complète",
    summary: "Diagnostic, ordre des travaux, devis, pilotage de chantier.",
    phase: 4,
    estimatedMinutes: 270,
    requiresLevel: 13,
  },
  {
    number: 15,
    slug: "projet-professionnel",
    title: "Projet professionnel",
    summary: "Mener un projet de A à Z avec une méthode professionnelle.",
    phase: 4,
    estimatedMinutes: 300,
    requiresLevel: 14,
  },
] as const;

export const TOTAL_ESTIMATED_MINUTES = LEVELS.reduce(
  (total, level) => total + level.estimatedMinutes,
  0,
);

export function getLevel(number: number): LevelMeta | undefined {
  return LEVELS.find((level) => level.number === number);
}

export function levelsOfPhase(phase: PhaseMeta["number"]): LevelMeta[] {
  return LEVELS.filter((level) => level.phase === phase);
}

/**
 * Détermine si un niveau est accessible.
 *
 * Règle : un niveau est ouvert si son prérequis est terminé **ou** s'il est
 * inférieur ou égal au niveau de départ issu du diagnostic — un apprenant
 * positionné au niveau 3 ne doit pas avoir à valider les niveaux 1 et 2
 * pour commencer.
 */
export function isLevelUnlocked(
  levelNumber: number,
  completedLevels: readonly number[],
  startingLevel = 1,
): boolean {
  const level = getLevel(levelNumber);
  if (!level) return false;
  if (levelNumber <= startingLevel) return true;
  if (level.requiresLevel === null) return true;
  return completedLevels.includes(level.requiresLevel);
}
