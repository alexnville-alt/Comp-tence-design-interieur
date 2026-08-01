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
import { SignUpForm } from "@/features/auth/sign-up-form";
import { GoogleButton } from "@/features/auth/google-button";
import { getCurrentUser } from "@/lib/auth";
import { hasGoogleOAuth } from "@/lib/env";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function InscriptionPage() {
  // Un utilisateur déjà connecté n'a rien à faire ici.
  if (await getCurrentUser()) redirect("/tableau-de-bord");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer votre compte</CardTitle>
        <CardDescription>
          Quelques minutes suffisent pour commencer votre premier niveau.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <SignUpForm />

        {hasGoogleOAuth ? (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">ou</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <GoogleButton callbackUrl="/bienvenue" />
          </>
        ) : null}

        <p className="text-center text-sm text-[var(--text-muted)]">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
