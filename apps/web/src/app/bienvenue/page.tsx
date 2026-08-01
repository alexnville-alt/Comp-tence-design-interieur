import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/wizard";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function BienvenuePage() {
  const user = await requireUser();

  // Refaire l'onboarding réécrirait le niveau de départ d'un apprenant déjà
  // engagé dans son parcours.
  if (user.onboarded) redirect("/tableau-de-bord");

  const firstName = user.name?.split(" ")[0] ?? null;

  return (
    <main id="contenu" className="mx-auto max-w-2xl px-6 py-12">
      <OnboardingWizard firstName={firstName} />
    </main>
  );
}
