import { AppShell } from "@/features/shell/app-shell";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * Zone applicative authentifiée.
 *
 * La vérification faite ici protège l'affichage, pas les données : chaque
 * Server Action et chaque requête refait sa propre vérification (docs/02 §6).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  return <AppShell role={user.role}>{children}</AppShell>;
}
