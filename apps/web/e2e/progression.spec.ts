import { prisma } from "@atelier/db";
import { expect, test } from "@playwright/test";
import { HEARTBEAT_INTERVAL_MS } from "../src/features/progression/heartbeat";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Progression et gamification (docs/05 M9) : XP, série avec gel, badges,
 * temps réel par heartbeat, tableau de bord, recommandations.
 */

test("terminer sa première leçon crédite le XP, démarre la série et débloque un badge, visibles sur le tableau de bord", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/parcours/decouverte/notions-generales/quest-ce-qu-un-espace-reussi");
  await page.getByRole("button", { name: "Marquer comme terminée" }).click();
  await expect(page.getByText("Leçon terminée.")).toBeVisible();

  await page.goto("/tableau-de-bord");

  // 20 XP (xpReward de la leçon) + 5 XP (bonus de série, première activité du jour).
  await expect(
    page.getByText("Niveau 1 · 25 XP · série 1 j", { exact: true }),
  ).toBeVisible();

  await expect(page.getByText("Badges — 1 / 16")).toBeVisible();
  await expect(page.getByText("Premiers pas")).toBeVisible();
});

test("le heartbeat mesure le temps actif et exclut un onglet caché", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);

  await page.clock.install();

  await page.goto("/parcours/decouverte/notions-generales/le-vocabulaire-de-base");
  // `HeartbeatTracker` enregistre son `setInterval` dans un effet, après
  // hydratation — attendre un élément hydraté du même arbre React avant
  // d'avancer l'horloge, sinon `fastForward` peut passer avant que le
  // minuteur n'existe (raté) ou juste après (double déclenchement).
  await expect(
    page.getByRole("button", { name: "Marquer comme terminée" }),
  ).toBeVisible();

  // Somme sur cet utilisateur, jamais une session « la plus récente » toutes
  // sessions confondues — la suite E2E fait naviguer bien d'autres comptes
  // sur des pages de leçon en parallèle du reste du fichier.
  async function totalActiveMsFor(userEmail: string): Promise<number> {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    const result = await prisma.studySession.aggregate({
      where: { userId: user.id, context: { startsWith: "lesson:" } },
      _sum: { activeMs: true },
    });
    return result._sum.activeMs ?? 0;
  }

  await page.clock.fastForward(HEARTBEAT_INTERVAL_MS);
  let activeMsAfterVisibleBurst = 0;
  await expect(async () => {
    activeMsAfterVisibleBurst = await totalActiveMsFor(email);
    // Au moins un battement reçu — le compte exact importe moins que
    // « strictement positif », le comportement testé est l'exclusion du
    // temps caché, pas la précision au tick près du minuteur du navigateur.
    expect(activeMsAfterVisibleBurst).toBeGreaterThan(0);
  }).toPass({ timeout: 5_000 });

  // Onglet caché : aucun battement supplémentaire ne doit être crédité.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(HEARTBEAT_INTERVAL_MS * 3);
  expect(await totalActiveMsFor(email)).toBe(activeMsAfterVisibleBurst);

  // La page redevient visible : les battements reprennent.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(HEARTBEAT_INTERVAL_MS);

  await expect(async () => {
    expect(await totalActiveMsFor(email)).toBeGreaterThan(activeMsAfterVisibleBurst);
  }).toPass({ timeout: 5_000 });
});

test("recommande de reprendre un projet resté sans activité", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);

  await page.goto("/atelier");
  await page.getByLabel("Nouveau projet").fill("Rénovation cuisine");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+$/);
  await page.getByLabel("Nouvelle pièce").fill("Cuisine");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);

  page.once("dialog", (dialog) => void dialog.accept("Premier jet"));
  await page.getByRole("button", { name: "Enregistrer (⌘S)" }).click();
  await expect(page.getByText("Premier jet", { exact: true }).first()).toBeVisible();

  // Antidater la seule version enregistrée : sans activité réelle possible
  // à rejouer dans un test, on simule directement l'ancienneté en base.
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const project = await prisma.project.findFirstOrThrow({ where: { userId: user.id } });
  // `Project.updatedAt` est géré par `@updatedAt` (Prisma l'ignore si on
  // tente de le passer explicitement) — seule la date de la version compte
  // ici, ce qui correspond justement au choix de `getAbandonedProject`
  // (l'activité réelle se lit sur les versions, pas sur le projet lui-même).
  const staleDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  await prisma.roomVersion.updateMany({
    where: { room: { projectId: project.id } },
    data: { createdAt: staleDate },
  });

  await page.goto("/tableau-de-bord");
  await expect(page.getByText("Recommandé pour vous")).toBeVisible();
  await expect(page.getByText(/Reprendre « Rénovation cuisine »/)).toBeVisible();
});
