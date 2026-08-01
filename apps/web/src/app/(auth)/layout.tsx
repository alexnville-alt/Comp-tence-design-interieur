import Link from "next/link";

/**
 * Mise en page des écrans d'authentification.
 *
 * Volontairement centrée et dépouillée : à ce moment du parcours, tout élément
 * qui n'aide pas à créer un compte ou se connecter est une distraction.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--surface)]">
      <header className="p-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text)]"
        >
          Atelier
        </Link>
      </header>

      <main id="contenu" className="flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
