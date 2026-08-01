import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "@/features/auth/sign-in-form";
import { GoogleButton } from "@/features/auth/google-button";
import { getCurrentUser } from "@/lib/auth";
import { hasGoogleOAuth } from "@/lib/env";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ reinitialise?: string }>;
}) {
  if (await getCurrentUser()) redirect("/tableau-de-bord");

  const params = await searchParams;
  const notice =
    params.reinitialise === "1"
      ? "Votre mot de passe a été modifié. Connectez-vous avec le nouveau."
      : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content de vous revoir</CardTitle>
        <CardDescription>Reprenez là où vous vous étiez arrêté.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <SignInForm notice={notice} />

        {hasGoogleOAuth ? (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">ou</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <GoogleButton />
          </>
        ) : null}

        <p className="text-center text-sm text-[var(--text-muted)]">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
