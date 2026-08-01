"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  LayoutDashboard,
  Library,
  PencilRuler,
  RotateCcw,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@atelier/ui";

/**
 * Coquille applicative : barre latérale sur desktop, barre inférieure sur
 * mobile (docs/03 §3).
 *
 * Les entrées non encore livrées restent visibles mais désactivées, avec la
 * mention du module qui les apportera. Les masquer donnerait l'impression que
 * l'application est plus pauvre qu'elle ne le sera ; les afficher comme
 * actives puis renvoyer une page vide serait pire.
 */

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  /** Module qui livrera la fonctionnalité — `null` si déjà disponible. */
  comingIn: string | null;
  /** Visible dans la barre inférieure mobile. */
  mobile: boolean;
}

const NAV: NavItem[] = [
  {
    href: "/tableau-de-bord",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    comingIn: null,
    mobile: true,
  },
  { href: "/parcours", label: "Parcours", icon: BookOpen, comingIn: null, mobile: true },
  {
    href: "/revisions",
    label: "Révisions",
    icon: RotateCcw,
    comingIn: null,
    mobile: true,
  },
  {
    href: "/atelier",
    label: "Atelier",
    icon: PencilRuler,
    comingIn: null,
    mobile: false,
  },
  {
    href: "/bibliotheque",
    label: "Bibliothèque",
    icon: Library,
    comingIn: "M7",
    mobile: true,
  },
  { href: "/projets", label: "Projets", icon: Home, comingIn: "M10", mobile: false },
];

const ADMIN_ITEM: NavItem = {
  href: "/administration/ia",
  label: "Administration IA",
  icon: ShieldCheck,
  comingIn: null,
  mobile: false,
};

const PROFILE_ITEM: NavItem = {
  href: "/profil",
  label: "Profil",
  icon: Settings,
  comingIn: null,
  mobile: true,
};

export function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "LEARNER" | "ADMIN";
}) {
  const pathname = usePathname();
  const nav = role === "ADMIN" ? [...NAV, ADMIN_ITEM] : NAV;

  // Note : l'état « à venir » est signalé par un libellé de module et
  // `aria-disabled`, jamais par une opacité réduite — voir tokens.css.
  return (
    <div className="flex min-h-dvh">
      {/* Barre latérale — masquée sous md */}
      <nav
        aria-label="Navigation principale"
        className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex"
      >
        <Link
          href="/tableau-de-bord"
          className="mb-6 px-3 font-[family-name:var(--font-display)] text-lg font-semibold"
        >
          Atelier
        </Link>

        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.href}>
              <SidebarLink item={item} active={pathname.startsWith(item.href)} />
            </li>
          ))}
        </ul>

        <div className="mt-auto border-t border-[var(--border)] pt-4">
          <SidebarLink
            item={PROFILE_ITEM}
            active={pathname.startsWith(PROFILE_ITEM.href)}
          />
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="contenu" className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Barre inférieure — masquée à partir de md */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-[var(--border)] bg-[var(--surface-raised)] md:hidden"
      >
        {[...NAV.filter((item) => item.mobile), PROFILE_ITEM].map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const disabled = item.comingIn !== null;

          return disabled ? (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-[var(--text-muted)]"
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
                active ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  if (item.comingIn) {
    return (
      <span
        aria-disabled="true"
        className="flex items-center gap-3 rounded-[var(--radius-atelier)] px-3 py-2 text-sm text-[var(--text-muted)]"
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        <span
          className="rounded-full bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] font-medium"
          title={`Disponible au module ${item.comingIn}`}
        >
          {item.comingIn}
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-atelier)] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--accent-subtle)] font-medium text-[var(--accent-strong)]"
          : "text-[var(--text)] hover:bg-[var(--surface-raised)]",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
