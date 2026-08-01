import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Indiquez votre adresse e-mail : nous vous enverrons un lien pour en définir un
          nouveau.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-[var(--text-muted)]">
          <Link
            href="/connexion"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Revenir à la connexion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
