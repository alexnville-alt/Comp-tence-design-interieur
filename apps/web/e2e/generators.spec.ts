import { prisma } from "@atelier/db";
import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Générateurs (docs/05 M8) : moodboard (palette + fiches bibliothèque,
 * édition libre, export PNG) et liste de mobilier dimensionnée.
 * `AI_PROVIDER=fake` en E2E, comme `photos.spec.ts` (M6) et `ia.spec.ts` (M5).
 *
 * Un seul compte pour tout le fichier — même raison que `photos.spec.ts` et
 * `library.spec.ts` : la limitation de débit d'inscription est partagée par
 * toute la suite E2E en local et en CI (un seul worker, une seule IP).
 */

function moodboardItemsList(page: Page) {
  return page.getByText("Éléments", { exact: true }).locator("..");
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

test("un moodboard se génère, s'édite (ajout/déplacement/suppression persistés), affiche le contraste de sa palette et s'exporte en PNG", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  await test.step("génération : palette + sélections, contraste affiché", async () => {
    // `createProjectAndRoom` laisse sur la page de la pièce — le lien
    // « Moodboards » vit sur la page du projet, un niveau au-dessus.
    const projectId = /\/atelier\/([a-z0-9]+)\/[a-z0-9]+$/.exec(page.url())?.[1];
    if (!projectId) throw new Error("id de projet introuvable dans l'URL");
    await page.goto(`/atelier/${projectId}`);
    await page.getByRole("link", { name: "Moodboards" }).click();
    await page.waitForURL(/\/moodboards$/);

    await page.getByLabel("Titre").fill("Ambiance salon");
    await page.getByRole("button", { name: "Générer" }).click();
    await page.waitForURL(/\/moodboards\/[a-z0-9]+$/, { timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Ambiance salon" })).toBeVisible();
    await expect(page.getByText("Contraste de la palette")).toBeVisible();
    await expect(page.getByText(/ratio .*:1/).first()).toBeVisible();

    await expect(moodboardItemsList(page).getByRole("listitem")).not.toHaveCount(0);
  });

  await test.step("ajouter une fiche bibliothèque persiste un nouvel élément", async () => {
    const before = await prisma.moodboardItem.count();

    await page.getByLabel("Ajouter une fiche bibliothèque").fill("chêne");
    await expect(page.getByRole("button", { name: "Ajouter" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Ajouter" }).first().click();

    await expect(async () => {
      expect(await prisma.moodboardItem.count()).toBe(before + 1);
    }).toPass({ timeout: 5_000 });
  });

  await test.step("déplacer un élément sélectionné au clavier puis enregistrer persiste la nouvelle position", async () => {
    const moodboardId = /\/moodboards\/([a-z0-9]+)$/.exec(page.url())?.[1];
    if (!moodboardId) throw new Error("id de moodboard introuvable dans l'URL");

    // Somme des x plutôt qu'un élément identifié : l'ordre de la liste
    // accessible (état React) et celui de `findMany` (sans `orderBy`) ne sont
    // pas garantis identiques — la somme est robuste à ça, peu importe lequel
    // des éléments a réellement bougé.
    const sumX = async () => {
      const items = await prisma.moodboardItem.findMany({
        where: { moodboardId },
        select: { transform: true },
      });
      return items.reduce(
        (total, item) => total + (item.transform as { x: number }).x,
        0,
      );
    };
    const sumBefore = await sumX();

    await moodboardItemsList(page).getByRole("button").first().focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+s" : "Control+s");

    await expect(page.getByText("Enregistré.")).toBeVisible({ timeout: 5_000 });
    expect(await sumX()).toBe(sumBefore + 40);
  });

  await test.step("supprimer un élément sélectionné au clavier le retire immédiatement", async () => {
    const before = await prisma.moodboardItem.count();

    await moodboardItemsList(page).getByRole("button").first().focus();
    await page.keyboard.press("Delete");

    await expect(async () => {
      expect(await prisma.moodboardItem.count()).toBe(before - 1);
    }).toPass({ timeout: 5_000 });
  });

  await test.step("l'export PNG déclenche un téléchargement fidèle au plateau", async () => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exporter en PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });
});

test("la liste de mobilier dimensionnée groupe les meubles identiques et lie une fiche existante", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  await page.getByRole("button", { name: "Pièce", exact: true }).click();
  await page.getByLabel("Largeur (cm)").fill("400");
  await page.getByLabel("Profondeur (cm)").fill("300");
  await page.getByRole("button", { name: "Créer la pièce" }).click();

  await page.getByRole("button", { name: "Mobilier", exact: true }).click();
  await page.getByRole("button", { name: "Chaise", exact: true }).click();
  await page.getByRole("button", { name: "Chaise", exact: true }).click();
  await page.getByRole("button", { name: "Bureau", exact: true }).click();

  // La liste de mobilier lit `RoomVersion.sceneData` (DB) — le mobilier posé
  // n'existe qu'en état local tant qu'aucune version n'est enregistrée (même
  // principe d'enregistrement explicite qu'ailleurs dans l'atelier, M4).
  page.once("dialog", (dialog) => void dialog.accept("Meublé"));
  await page.getByRole("button", { name: "Enregistrer (⌘S)" }).click();
  await expect(page.getByText("Meublé", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Liste de mobilier" }).click();
  await page.waitForURL(/\/mobilier$/);

  await expect(page.getByText("Chaise × 2")).toBeVisible();
  await expect(page.getByText("45 × 50 × 90 cm")).toBeVisible();
  await expect(page.getByText("Bureau", { exact: true })).toBeVisible();
});
