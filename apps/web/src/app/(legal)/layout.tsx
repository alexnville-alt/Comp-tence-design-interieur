import Link from "next/link";

/**
 * Mise en page des pages légales (M12) — publiques, jamais derrière
 * l'authentification : un visiteur qui n'a pas encore de compte doit
 * pouvoir les lire avant de s'inscrire.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text)]"
        >
          Atelier
        </Link>
        <nav aria-label="Documents légaux" className="flex gap-4 text-sm">
          <Link href="/politique-de-confidentialite">Confidentialité</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/accessibilite">Accessibilité</Link>
        </nav>
      </header>
      {/* `tabIndex={-1}` : cible du lien d'évitement (voir app/page.tsx). */}
      <main id="contenu" tabIndex={-1}>
        <article className="space-y-8 text-sm leading-relaxed text-[var(--text)]">
          {children}
        </article>
      </main>
    </div>
  );
}
