import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { SkipLink } from "@/components/skip-link";
import { readReducedMotion, readThemePreference, themeAttribute } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Atelier — Apprendre le design d'intérieur",
    template: "%s · Atelier",
  },
  description:
    "Du débutant complet au niveau professionnel : concevez et rénovez vous-même " +
    "chaque pièce de votre habitation.",
  // Ouvert au public en M12 (docs/05) : jusqu'ici, rien ne justifiait
  // l'indexation d'une application encore en construction. Les pages
  // légales (M12) marquent explicitement les informations d'identité de
  // l'éditeur restant à compléter avant un lancement réel — voir
  // /cgu et /politique-de-confidentialite.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `themeColor` s'adapte au thème : sinon la barre d'adresse mobile reste
  // claire en mode sombre, ce qui se voit immédiatement.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#232120" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lecture serveur : le thème est appliqué dès le premier octet de HTML,
  // donc aucun clignotement au chargement (voir lib/theme).
  const [theme, reducedMotion] = await Promise.all([
    readThemePreference(),
    readReducedMotion(),
  ]);

  return (
    <html
      lang="fr"
      data-theme={themeAttribute(theme)}
      data-reduced-motion={reducedMotion ? "true" : undefined}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
