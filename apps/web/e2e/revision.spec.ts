import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Session de révision espacée (docs/05 M3, ADR-0007).
 *
 * Entièrement au clavier : Espace/Entrée retourne la carte, 1-4 notent —
 * critère d'acceptation explicite de la feuille de route pour ce module.
 */

test("une session de révision se joue entièrement au clavier", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto("/revisions");

  await expect(page.getByText(/Carte 1 \//)).toBeVisible();

  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /3 · Correct/ })).toBeVisible();

  await page.keyboard.press("3");
  await expect(page.getByText(/Carte 2 \//)).toBeVisible();
});

test("terminer toute la file affiche le récapitulatif de session", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto("/revisions");

  const countText = await page.getByText(/Carte 1 \//).textContent();
  const total = Number(countText?.match(/\/\s*(\d+)/)?.[1]);
  expect(total).toBeGreaterThan(0);

  for (let i = 0; i < total; i++) {
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /3 · Correct/ })).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByRole("button", { name: /3 · Correct/ })).toHaveCount(0);
  }

  await expect(page.getByText(/Session terminée/)).toBeVisible();
});
