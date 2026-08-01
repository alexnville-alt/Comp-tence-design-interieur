import type { Metadata } from "next";
import { prisma } from "@atelier/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administration IA" };
export const dynamic = "force-dynamic";

const FEATURE_LABELS: Record<string, string> = {
  CHAT: "Chat pédagogique",
  PHOTO_ANALYSIS: "Analyse photo",
  GRADING: "Correction (cas ouverts)",
  GENERATOR: "Générateurs",
  CRITIQUE: "Critique de projet",
};

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function AdministrationIaPage() {
  await requireAdmin();

  const since = startOfCurrentMonth();

  const [byFeature, byFeatureFailures, byUser, totalUsers] = await Promise.all([
    prisma.aiUsage.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: since } },
      _sum: { costCents: true, inputTokens: true, outputTokens: true },
      _count: { _all: true },
      orderBy: { feature: "asc" },
    }),
    prisma.aiUsage.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: since }, success: false },
      _count: { _all: true },
    }),
    prisma.aiUsage.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
      _sum: { costCents: true },
      _count: { _all: true },
      orderBy: { _sum: { costCents: "desc" } },
      take: 10,
    }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: since } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const failuresByFeature = new Map(
    byFeatureFailures.map((row) => [row.feature, row._count._all]),
  );

  const userIds = byUser.map((row) => row.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      name: true,
      profile: { select: { aiMonthlyQuota: true } },
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const totalCostCents = byFeature.reduce(
    (sum, row) => sum + (row._sum.costCents ?? 0),
    0,
  );
  const totalCalls = byFeature.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
          Réservé aux administrateurs
        </p>
        <h1 className="text-3xl">Administration IA — quotas et coûts</h1>
        <p className="text-[var(--text-muted)]">
          Mois en cours (
          {since.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}) —{" "}
          {totalUsers.length} apprenant{totalUsers.length > 1 ? "s" : ""} ayant utilisé
          l'IA, {totalCalls} appel{totalCalls > 1 ? "s" : ""}, {euros(totalCostCents)} au
          total.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Par fonctionnalité</CardTitle>
        </CardHeader>
        <CardContent>
          {byFeature.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Aucun appel IA ce mois-ci.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Fonctionnalité
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Appels
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Échecs
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Tokens (entrée/sortie)
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Coût
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byFeature.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 pr-4 text-[var(--text)]">
                        {FEATURE_LABELS[row.feature] ?? row.feature}
                      </td>
                      <td className="py-2 pr-4">{row._count._all}</td>
                      <td className="py-2 pr-4">
                        {failuresByFeature.get(row.feature) ?? 0}
                      </td>
                      <td className="py-2 pr-4 font-[family-name:var(--font-mono)]">
                        {(row._sum.inputTokens ?? 0).toLocaleString("fr-FR")} /{" "}
                        {(row._sum.outputTokens ?? 0).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2 font-[family-name:var(--font-mono)]">
                        {euros(row._sum.costCents ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Par apprenant (10 premiers par coût)</CardTitle>
        </CardHeader>
        <CardContent>
          {byUser.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Aucun appel IA ce mois-ci.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Apprenant
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Appels / quota mensuel
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Coût
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byUser.map((row) => {
                    const user = userById.get(row.userId);
                    return (
                      <tr
                        key={row.userId}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-2 pr-4 text-[var(--text)]">
                          {user?.name ?? user?.email ?? row.userId}
                        </td>
                        <td className="py-2 pr-4">
                          {row._count._all} / {user?.profile?.aiMonthlyQuota ?? "—"}
                        </td>
                        <td className="py-2 font-[family-name:var(--font-mono)]">
                          {euros(row._sum.costCents ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
