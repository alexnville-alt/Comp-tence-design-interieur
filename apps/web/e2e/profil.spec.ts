import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

test("les préférences sont enregistrées et le thème s'applique sans rechargement blanc", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/profil");
  await page.getByLabel("Thème").selectOption("DARK");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByText("Préférences enregistrées.")).toBeVisible();

  // Le thème est posé côté serveur sur <html> : il survit à un rechargement
  // complet, sans script client (voir lib/theme).
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("l'export RGPD renvoie les données du compte", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);

  const response = await page.request.get("/api/compte/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("attachment");

  const payload = (await response.json()) as {
    format: string;
    user: { email: string; profile: { onboardedAt: string } };
  };
  expect(payload.format).toBe("atelier-export-v1");
  expect(payload.user.email).toBe(email);
  expect(payload.user.profile.onboardedAt).toBeTruthy();
});

test("l'export refuse un visiteur non connecté", async ({ page }) => {
  const response = await page.request.get("/api/compte/export", {
    maxRedirects: 0,
  });
  // requireUser() redirige vers /connexion plutôt que de renvoyer les données.
  expect([302, 303, 307]).toContain(response.status());
});

test("la suppression exige la saisie exacte de l'adresse e-mail", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto("/profil");

  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page
    .getByLabel("Confirmez en saisissant votre adresse e-mail")
    .fill("pas-la-bonne@exemple.test");
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();

  await expect(page.getByText(/Saisissez exactement votre adresse/)).toBeVisible();
});

test("la suppression déconnecte immédiatement et bloque l'accès", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);
  await page.goto("/profil");

  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Confirmez en saisissant votre adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();

  await expect(page).toHaveURL(/compte-supprime=1/);

  // La session est révoquée : la zone applicative n'est plus accessible.
  await page.goto("/tableau-de-bord");
  await expect(page).toHaveURL(/\/connexion/);
});
