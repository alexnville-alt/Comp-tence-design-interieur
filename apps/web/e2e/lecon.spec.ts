import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Lecteur de leçon (docs/05 M2).
 *
 * Ces tests portent sur le contenu réel du niveau 1 (`content/niveaux/
 * decouverte/01-notions-generales/`) — pas de fixtures : c'est la même leçon
 * que verra un apprenant, avec ses 8 blocs.
 */

const LECON_URL = "/parcours/decouverte/notions-generales/quest-ce-qu-un-espace-reussi";

test("reprise exacte : quitter en cours de lecture puis revenir y reprend", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto(LECON_URL);
  await expect(
    page.getByRole("heading", { name: "Qu'est-ce qu'un espace réussi ?" }),
  ).toBeVisible();

  // Avec un viewport bas, un seul bloc est visible à la fois : le bloc « le
  // plus loin atteint » correspond exactement à celui vers lequel on défile,
  // sans dépendre de combien de blocs tiennent sur un grand écran.
  await page.setViewportSize({ width: 1280, height: 300 });
  await page.locator("#bloc-4").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.body.dataset.lastSavedBlock === "4");

  // Une nouvelle navigation, comme un onglet rouvert plus tard.
  await page.goto("/tableau-de-bord");
  await page.goto(LECON_URL);

  await page.waitForFunction(() => document.body.dataset.resumedAtBlock === "4");
  await expect(page.locator("#bloc-4")).toBeInViewport();
  await expect(page.getByText("Vous reprenez au bloc 4")).toBeVisible();
});

test("lecture 100 % clavier : la section « Aller plus loin » se déplie au clavier", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(LECON_URL);

  const details = page.locator("#bloc-4 details");
  const summary = details.locator("summary");

  await summary.focus();
  await expect(details).not.toHaveAttribute("open", "");

  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details).toContainText("architectes d'intérieur professionnels");
});

test("marquer une leçon comme terminée", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(LECON_URL);

  await page.getByRole("button", { name: "Marquer comme terminée" }).click();
  await expect(page.getByText("Leçon terminée.")).toBeVisible();

  // La complétion persiste au rechargement (écrite en base, pas en mémoire client).
  await page.reload();
  await expect(page.getByText("Leçon terminée.")).toBeVisible();
});
