import { expect, test } from "@playwright/test";
import { VALID_PASSWORD, completeOnboarding, signUp, uniqueEmail } from "./helpers";

/**
 * Parcours critiques de M1 (docs/02 §7).
 * Ces tests protègent le chemin sans lequel l'application n'existe pas :
 * créer un compte, être positionné, revenir.
 */

test("inscription → onboarding → tableau de bord", async ({ page }) => {
  await signUp(page, { name: "Camille" });

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Camille");
  await completeOnboarding(page);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Camille");
  await expect(page.getByText("Votre compte est prêt")).toBeVisible();
});

test("le diagnostic positionne à un niveau supérieur quand les réponses sont bonnes", async ({
  page,
}) => {
  await signUp(page);

  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Les bonnes réponses aux 5 questions (voir @atelier/domain/diagnostic).
  await page.getByText("L'élément qui attire le regard en premier").click();
  await page.getByText("90 cm", { exact: true }).click();
  await page.getByText("La répartition d'une palette de couleurs").click();
  await page.getByText("2700 K, blanc chaud").click();
  await page.getByText("Après les travaux salissants, avant les finitions").click();

  await page.getByRole("button", { name: "Continuer" }).click();

  // Le niveau est recalculé côté serveur : l'affichage n'est qu'un aperçu.
  await expect(page.getByRole("status").filter({ hasText: "Niveau 4" })).toBeVisible();
  await page.getByRole("button", { name: "Commencer mon parcours" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord/);
  await expect(page.getByText("Nous vous avons positionné au niveau 4")).toBeVisible();
});

test("déconnexion puis reconnexion ramène au tableau de bord", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);

  await page.goto("/profil");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();

  // L'onboarding étant terminé, on va directement au tableau de bord.
  await expect(page).toHaveURL(/\/tableau-de-bord/);
});

test("un mot de passe incorrect ne révèle pas si le compte existe", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);
  await page.goto("/profil");
  await page.getByRole("button", { name: "Se déconnecter" }).click();

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe-42");
  await page.getByRole("button", { name: "Se connecter" }).click();

  const alerteFormulaire = page.locator("form").getByRole("alert");
  await expect(alerteFormulaire).toHaveCount(1);
  const messageCompteExistant = await alerteFormulaire.textContent();

  await page.getByLabel("Adresse e-mail").fill(uniqueEmail("inexistant"));
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe-42");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(alerteFormulaire).toHaveCount(1);
  const messageCompteInconnu = await alerteFormulaire.textContent();

  // Message strictement identique : c'est ce qui empêche l'énumération.
  expect(messageCompteInconnu).toBe(messageCompteExistant);
});

test("une route protégée redirige vers la connexion", async ({ page }) => {
  await page.goto("/tableau-de-bord");
  await expect(page).toHaveURL(/\/connexion/);
});

test("l'onboarding ne peut pas être rejoué", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/bienvenue");
  await expect(page).toHaveURL(/\/tableau-de-bord/);
});

test("un mot de passe faible est refusé côté serveur", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill("Alex");
  await page.getByLabel("Adresse e-mail").fill(uniqueEmail());
  // `noValidate` sur le formulaire : la soumission atteint bien le serveur.
  await page.getByLabel("Mot de passe").fill("motdepasse1");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // Le message apparaît sous le champ (erreur serveur) et dans la jauge de
  // robustesse : on cible explicitement l'erreur de champ.
  await expect(page.getByText(/trop courant/i).first()).toBeVisible();
  await expect(page).toHaveURL(/\/inscription/);
});
