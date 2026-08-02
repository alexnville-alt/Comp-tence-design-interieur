import { z } from "zod";
import { BadgeCriteriaSchema } from "../progression/badge-criteria";

/**
 * Contenu des badges (docs/05 M9, PROG-02) — données déclaratives pures,
 * synchronisées en base par `sync-content.ts` (upsert par `slug`, même
 * mécanisme que `LEVELS`). `evaluateBadge` (`../progression/badge-criteria`)
 * est la seule fonction qui sait lire `criteria` : ajouter un badge n'ajoute
 * jamais de code.
 *
 * 16 badges réels couvrant les quatre catégories de PROG-02 (jalons,
 * régularité, exploration, maîtrise) — l'estimation « ~30 » de docs/04 §7
 * (volumétrie) est un objectif à terme, complété au fil des modules suivants
 * (chaque nouvelle fonctionnalité peut justifier un nouveau jalon), même
 * logique de corpus honnêtement partiel que la bibliothèque (M7, 54/300
 * fiches).
 *
 * Les compteurs référencés par les critères `count` (ex. `lesson_completed`,
 * `photo_analysis`) sont assemblés côté application, pas ici — voir
 * `features/progression/badge-context.ts` (`apps/web`).
 */
export const BadgeDefinitionSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  /** Nom de composant `lucide-react` (`apps/web`), ex. "Flame". */
  icon: z.string().trim().min(1),
  criteria: BadgeCriteriaSchema,
});
export type BadgeDefinition = z.infer<typeof BadgeDefinitionSchema>;

export const BADGES: readonly BadgeDefinition[] = [
  // ── Jalons ─────────────────────────────────────────────────────────────
  {
    slug: "premiers-pas",
    title: "Premiers pas",
    description: "Terminer sa première leçon.",
    icon: "Footprints",
    criteria: { type: "count", metric: "lesson_completed", gte: 1 },
  },
  {
    slug: "premier-projet",
    title: "Premier projet",
    description: "Créer son premier projet dans l'atelier.",
    icon: "Home",
    criteria: { type: "count", metric: "project_created", gte: 1 },
  },
  {
    slug: "premiere-piece",
    title: "Première pièce",
    description: "Créer sa première pièce dans l'atelier.",
    icon: "Sofa",
    criteria: { type: "count", metric: "room_created", gte: 1 },
  },
  {
    slug: "oeil-de-lynx",
    title: "Œil de lynx",
    description: "Faire analyser sa première photo de pièce.",
    icon: "Camera",
    criteria: { type: "count", metric: "photo_analysis", gte: 1 },
  },
  {
    slug: "ambianceur",
    title: "Ambianceur",
    description: "Générer son premier moodboard.",
    icon: "Palette",
    criteria: { type: "count", metric: "moodboard_generated", gte: 1 },
  },
  {
    slug: "niveau-1-en-poche",
    title: "Niveau 1 en poche",
    description: "Terminer le niveau 1 — Découverte.",
    icon: "GraduationCap",
    criteria: { type: "level_complete", level: 1 },
  },
  // ── Régularité ─────────────────────────────────────────────────────────
  {
    slug: "trois-jours-daffilee",
    title: "Trois jours d'affilée",
    description: "Être actif trois jours de suite.",
    icon: "Flame",
    criteria: { type: "streak", days: 3 },
  },
  {
    slug: "une-semaine-entiere",
    title: "Une semaine entière",
    description: "Être actif sept jours de suite.",
    icon: "CalendarCheck",
    criteria: { type: "streak", days: 7 },
  },
  {
    slug: "un-mois-de-regularite",
    title: "Un mois de régularité",
    description: "Être actif trente jours de suite.",
    icon: "CalendarDays",
    criteria: { type: "streak", days: 30 },
  },
  {
    slug: "cent-jours",
    title: "Cent jours",
    description: "Être actif cent jours de suite.",
    icon: "Trophy",
    criteria: { type: "streak", days: 100 },
  },
  // ── Exploration ────────────────────────────────────────────────────────
  {
    slug: "collectionneur",
    title: "Collectionneur",
    description: "Ajouter cinq fiches à ses favoris dans la bibliothèque.",
    icon: "Heart",
    criteria: { type: "count", metric: "favorite_library", gte: 5 },
  },
  {
    slug: "touche-a-tout",
    title: "Touche-à-tout",
    description: "Réussir vingt exercices.",
    icon: "Dumbbell",
    criteria: { type: "count", metric: "exercise_completed", gte: 20 },
  },
  {
    slug: "assidu-des-revisions",
    title: "Assidu des révisions",
    description: "Effectuer cinquante révisions de cartes.",
    icon: "BookOpen",
    criteria: { type: "count", metric: "review_completed", gte: 50 },
  },
  {
    slug: "decorateur-en-herbe",
    title: "Décorateur en herbe",
    description: "Générer cinq moodboards.",
    icon: "Sparkles",
    criteria: { type: "count", metric: "moodboard_generated", gte: 5 },
  },
  // ── Maîtrise ───────────────────────────────────────────────────────────
  {
    slug: "maitrise-niveau-1",
    title: "Maîtrise du niveau 1",
    description: "Terminer le niveau 1 avec au moins 90 % à l'évaluation.",
    icon: "Star",
    criteria: { type: "count", metric: "level_mastered", gte: 1 },
  },
  {
    slug: "perfectionniste",
    title: "Perfectionniste",
    description: "Réussir dix exercices du premier coup, sans erreur.",
    icon: "Crown",
    criteria: { type: "count", metric: "perfect_exercise", gte: 10 },
  },
];
