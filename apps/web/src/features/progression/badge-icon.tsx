import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Camera,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Heart,
  Home,
  Palette,
  Sofa,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

/** Icônes réellement utilisées par `BADGES` (`@atelier/domain`) — voir `curriculum/badges.ts`. */
const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Camera,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Heart,
  Home,
  Palette,
  Sofa,
  Sparkles,
  Star,
  Trophy,
};

export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
