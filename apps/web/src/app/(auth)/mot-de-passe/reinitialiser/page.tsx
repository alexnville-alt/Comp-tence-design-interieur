import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { checkResetToken } from "@/lib/auth/reset-token";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

const REASONS: Record<string, string> = {
  expired: "Ce lien a expiré. Les liens sont valables une heure.",
  already_used: "Ce lien a déjà été utilisé.",
  unknown: "Ce lien n'est pas valide.",
};

export default async function ReinitialiserPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // On vérifie le jeton **sans le consommer** : afficher un formulaire qui
  // échouera à coup sûr à la soumission est une perte de temps pour
  // l'utilisateur.
  const check = token
    ? await checkResetToken(token)
    : { valid: false, reason: "unknown" as const };

  if (!token || !check.valid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lien invalide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert tone="danger">{REASONS[check.reason ?? "unknown"]}</Alert>
          <p className="text-sm text-[var(--text-muted)]">
            <Link
              href="/mot-de-passe-oublie"
              className="text-[var(--accent)] underline underline-offset-4"
            >
              Demander un nouveau lien
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un mot de passe que vous retiendrez.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
