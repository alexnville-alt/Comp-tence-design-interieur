import type { Metadata } from "next";
import { prisma } from "@atelier/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/profile/profile-form";
import { DangerZone } from "@/features/profile/danger-zone";
import { SignOutButton } from "@/features/profile/sign-out-button";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const user = await requireOnboardedUser();

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId: user.id },
    select: {
      theme: true,
      weeklyMinutes: true,
      reducedMotion: true,
      soundEnabled: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Profil</h1>
          <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Préférences</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              name: user.name ?? "",
              theme: profile.theme,
              weeklyMinutes: profile.weeklyMinutes,
              reducedMotion: profile.reducedMotion,
              soundEnabled: profile.soundEnabled,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos données</CardTitle>
          <CardDescription>
            Vous pouvez récupérer l'intégralité de vos données à tout moment, dans un
            format réutilisable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Lien direct plutôt qu'action : le navigateur gère le
              téléchargement nativement, sans JavaScript. */}
          <Button asChild variant="secondary">
            <a href="/api/compte/export" download>
              Exporter mes données (JSON)
            </a>
          </Button>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Voir la{" "}
            <a
              href="/politique-de-confidentialite"
              className="underline underline-offset-2"
            >
              politique de confidentialité
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card className="border-[var(--danger)]">
        <CardHeader>
          <CardTitle>Supprimer mon compte</CardTitle>
        </CardHeader>
        <CardContent>
          <DangerZone email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
