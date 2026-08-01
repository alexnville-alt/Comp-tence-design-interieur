import { expect, type Page } from "@playwright/test";

/**
 * Chaque test crée son propre compte, avec une adresse unique.
 *
 * Partager un compte entre tests les rendrait dépendants de leur ordre
 * d'exécution et de l'état laissé par le précédent — la première cause de
 * tests instables.
 */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@exemple.test`;
}

export const VALID_PASSWORD = "le chat dort sur le radiateur";

export async function signUp(
  page: Page,
  options: { email?: string; name?: string } = {},
): Promise<string> {
  const email = options.email ?? uniqueEmail();

  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill(options.name ?? "Alex");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL(/\/bienvenue/);
  return email;
}

/** Parcourt l'onboarding en acceptant les valeurs par défaut. */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continuer" }).click(); // objectif
  await page.getByRole("button", { name: "Continuer" }).click(); // logement + rythme
  await page.getByRole("button", { name: "Passer le diagnostic" }).click();
  await page.getByRole("button", { name: "Commencer mon parcours" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord/);
}
