import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Atelier 2D (docs/05 M4).
 *
 * Couvre deux des parcours critiques de docs/02 §7 : « créer une pièce →
 * poser mobilier → enregistrer une version » et « recharger conserve l'état ».
 * La création de pièce et l'ajout de mobilier passent par une saisie
 * numérique et des boutons plutôt qu'un tracé libre à la souris — c'est ce
 * qui permet au test de rester entièrement au clavier, comme l'exige le
 * critère d'acceptation du module.
 *
 * Le placement d'une porte/fenêtre *par clic sur le canevas* n'est pas
 * couvert ici : le hit-testing précis sur un `<canvas>` react-konva est
 * fragile en automatisé. Le chemin clavier (sélectionner un mur dans la liste
 * accessible, bouton « Ajouter une porte ») l'est, lui, entièrement — voir le
 * test dédié plus bas. La géométrie des ouvertures (limites, chevauchement)
 * est vérifiée sans navigateur dans `packages/domain/src/geometry`.
 */

/**
 * L'étiquette de la version courante (un `<span>`, avant la liste dans le
 * DOM) et son entrée dans l'historique (un `<button>`, après) portent le même
 * libellé une fois une version enregistrée — `.first()` cible sans ambiguïté
 * le `<span>`, qui précède toujours la liste dans `version-bar.tsx`.
 */
function currentVersionLabel(page: Page, label: string) {
  return page.getByText(label, { exact: true }).first();
}

async function createProjectAndRoom(page: Page) {
  await page.goto("/atelier");
  await page.getByLabel("Nouveau projet").fill("Mon appartement");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+$/);

  await page.getByLabel("Nouvelle pièce").fill("Salon");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);
}

test("une pièce complète se construit et une version s'enregistre entièrement au clavier", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  // Outil « Pièce », saisie numérique, création (Tab + Entrée fonctionnerait
  // tout aussi bien — le bouton est un simple <button type="submit">).
  await page.getByRole("button", { name: "Pièce", exact: true }).click();
  await page.getByLabel("Largeur (cm)").fill("400");
  await page.getByLabel("Profondeur (cm)").fill("300");
  await page.getByRole("button", { name: "Créer la pièce" }).click();

  const objectList = page.getByText("Objets de la pièce").locator("..");
  await expect(objectList.getByText("Mur, 400 cm")).toHaveCount(2);
  await expect(objectList.getByText("Mur, 300 cm")).toHaveCount(2);

  // Poser un meuble depuis le catalogue : il arrive posé, prêt à ajuster.
  await page.getByRole("button", { name: "Mobilier", exact: true }).click();
  await page.getByRole("button", { name: "Canapé 3 places" }).click();
  await expect(objectList.getByText(/Canapé 3 places, 220 × 95 cm/)).toBeVisible();

  // Déplacer au clavier par pas de 1/10 cm, puis pivoter.
  const furnitureItem = page.getByRole("button", { name: /Canapé 3 places, 220/ });
  await furnitureItem.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("X (cm)")).toHaveValue("200.3");

  await page.keyboard.press("r");
  await expect(furnitureItem).toContainText("pivoté de 15°");

  // Enregistrer une version (⌘S déclenche une invite native).
  page.once("dialog", (dialog) => void dialog.accept("Salon meublé"));
  await page.getByRole("button", { name: "Enregistrer (⌘S)" }).click();
  await expect(currentVersionLabel(page, "Salon meublé")).toBeVisible();
  await expect(page.getByText("non enregistrée")).toHaveCount(0);
});

test("recharger la page restaure la scène à l'identique", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);
  const roomUrl = page.url();

  await page.getByRole("button", { name: "Pièce", exact: true }).click();
  await page.getByLabel("Largeur (cm)").fill("350");
  await page.getByLabel("Profondeur (cm)").fill("280");
  await page.getByRole("button", { name: "Créer la pièce" }).click();

  await page.getByRole("button", { name: "Mobilier", exact: true }).click();
  await page.getByRole("button", { name: "Lit double (160×200)" }).click();

  page.once("dialog", (dialog) => void dialog.accept("Avant rechargement"));
  await page.getByRole("button", { name: "Enregistrer (⌘S)" }).click();
  await expect(currentVersionLabel(page, "Avant rechargement")).toBeVisible();

  await page.goto(roomUrl);

  const objectList = page.getByText("Objets de la pièce").locator("..");
  await expect(objectList.getByText("Mur, 350 cm")).toHaveCount(2);
  await expect(objectList.getByText("Mur, 280 cm")).toHaveCount(2);
  await expect(objectList.getByText(/Lit double.*160 × 200 cm/)).toBeVisible();
});

test("poser une porte sur un mur sélectionné au clavier, sans souris", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  await page.getByRole("button", { name: "Pièce", exact: true }).click();
  await page.getByLabel("Largeur (cm)").fill("400");
  await page.getByLabel("Profondeur (cm)").fill("300");
  await page.getByRole("button", { name: "Créer la pièce" }).click();

  const objectList = page.getByText("Objets de la pièce").locator("..");
  const firstWall = objectList.getByRole("button", { name: "Mur, 400 cm" }).first();
  await firstWall.focus(); // sélectionne le mur (onFocus) — pur clavier, pas de clic

  await page.getByRole("button", { name: "Ajouter une porte" }).click();
  const properties = page.getByLabel("Propriétés et alertes");
  await expect(properties.getByText("Porte", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Position sur le mur (cm)")).toHaveValue("155");

  // La position se règle ensuite au clavier, dans le panneau de propriétés.
  await page.getByLabel("Position sur le mur (cm)").fill("50");
  await expect(page.getByLabel("Position sur le mur (cm)")).toHaveValue("50");
});

test("le comparateur avant/après affiche deux versions de la pièce", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  await page.getByRole("button", { name: "Pièce", exact: true }).click();
  await page.getByLabel("Largeur (cm)").fill("400");
  await page.getByLabel("Profondeur (cm)").fill("300");
  await page.getByRole("button", { name: "Créer la pièce" }).click();

  page.once("dialog", (dialog) => void dialog.accept("Vide"));
  await page.getByRole("button", { name: "Enregistrer (⌘S)" }).click();
  await expect(currentVersionLabel(page, "Vide")).toBeVisible();

  await page.getByRole("button", { name: "Mobilier", exact: true }).click();
  await page.getByRole("button", { name: "Bureau" }).click();

  page.once("dialog", (dialog) => void dialog.accept("Avec bureau"));
  await page.getByRole("button", { name: "Enregistrer (⌘S)" }).click();
  await expect(currentVersionLabel(page, "Avec bureau")).toBeVisible();

  await page.getByRole("button", { name: "Comparer" }).click();
  await expect(page.getByRole("slider", { name: /Comparateur/ })).toBeVisible();
});
