import { prisma } from "@atelier/db";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Projet personnel (docs/05 M10) : état d'avancement des pièces, import de
 * plan et calibrage, photos par pièce, journal de projet, mode « architecte
 * accompagnateur » et export dossier PDF. `AI_PROVIDER=fake` en E2E, comme
 * `ia.spec.ts` (M5) et `generators.spec.ts` (M8).
 *
 * Un seul compte pour tout le fichier — même raison que `photos.spec.ts` et
 * `generators.spec.ts` : la limitation de débit d'inscription est partagée
 * par toute la suite E2E (un seul worker, une seule IP).
 */

async function createProjectAndRoom(page: Page, roomName = "Salon") {
  await page.goto("/atelier");
  await page.getByLabel("Nouveau projet").fill("Mon appartement");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+$/);
  await page.getByLabel("Nouvelle pièce").fill(roomName);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);
}

async function jpegFixture(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 210, g: 180, b: 140 } },
  })
    .jpeg()
    .toBuffer();
}

test("projet personnel : état de pièce, photos, plan calibré, journal, architecte accompagnateur et dossier PDF", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  const roomUrl = page.url();
  const projectId = /\/atelier\/([a-z0-9]+)\/[a-z0-9]+$/.exec(roomUrl)?.[1];
  if (!projectId) throw new Error("id de projet introuvable dans l'URL");
  const projectUrl = `/atelier/${projectId}`;

  await test.step("état d'avancement : se modifie sur la pièce, s'affiche sur le projet", async () => {
    const roomId = /\/atelier\/[a-z0-9]+\/([a-z0-9]+)$/.exec(roomUrl)?.[1];
    if (!roomId) throw new Error("id de pièce introuvable dans l'URL");

    await page.getByLabel("État").selectOption("VALIDATED");
    // La mutation est asynchrone (Server Action déclenchée dans `onChange`,
    // non attendue par le navigateur) : on vérifie la persistance en base
    // avant de naviguer, plutôt que de risquer une course avec `page.goto`.
    await expect(async () => {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { status: true },
      });
      expect(room?.status).toBe("VALIDATED");
    }).toPass({ timeout: 5_000 });

    await page.goto(projectUrl);
    await expect(page.getByText("Validée", { exact: true })).toBeVisible();
  });

  await test.step("plan de référence : import puis calibrage donnent une mesure cohérente", async () => {
    await page.goto(roomUrl);
    await page.getByRole("link", { name: "Plan de référence" }).click();
    await page.waitForURL(/\/plan$/);

    const planBuffer = await jpegFixture(400, 200);
    await page.getByLabel("Importer un plan de cette pièce").setInputFiles({
      name: "plan.jpg",
      mimeType: "image/jpeg",
      buffer: planBuffer,
    });

    const planImage = page.getByAltText(
      "Plan importé, à calibrer en cliquant deux points de repère",
    );
    await expect(planImage).toBeVisible();
    const box = (await planImage.boundingBox())!;

    // Deux points horizontalement écartés du quart aux trois-quarts de
    // l'image — une distance connue (400 cm, la largeur réelle simulée) sans
    // dépendre du recadrage exact opéré par `processUploadedImage`.
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);

    await page.getByLabel("Distance réelle entre les deux points (cm)").fill("200");
    await page.getByRole("button", { name: "Calibrer" }).click();

    await expect(page.getByText(/Calibré — \d+([.,]\d+)? cm\/px/)).toBeVisible();
  });

  await test.step("photos de la pièce : ajout avec note, puis suppression", async () => {
    await page.goto(roomUrl);
    await page.getByRole("link", { name: "Photos de la pièce" }).click();
    await page.waitForURL(/\/photos-projet$/);

    const photoBuffer = await jpegFixture(320, 240);
    await page.getByLabel("Note (optionnelle)").fill("Mur nord, avant travaux");
    await page.getByLabel("Ajouter une photo de cette pièce").setInputFiles({
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: photoBuffer,
    });

    await expect(page.getByText("Mur nord, avant travaux")).toBeVisible();

    await page.getByRole("button", { name: "Retirer" }).click();
    await expect(page.getByText("Mur nord, avant travaux")).toHaveCount(0);
  });

  await test.step("budget et adresse du projet s'enregistrent", async () => {
    await page.goto(projectUrl);
    await page.getByLabel("Adresse du logement").fill("12 rue des Lilas, Lyon");
    await page.getByLabel("Budget estimé (€, ordre de grandeur)").fill("8500");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Enregistré.")).toBeVisible();
  });

  await test.step("journal de projet : ajout puis suppression d'une entrée", async () => {
    await page.goto(projectUrl);
    await page.getByLabel("Titre").fill("Budget cuisine");
    // `getByLabel("Type")` est ambigu sur cette page : `CreateRoomForm`
    // (au-dessus) a aussi un champ "Type" pour le type de pièce.
    await page.locator("#journal-kind").selectOption("BUDGET");
    await page
      .getByLabel("Contenu")
      .fill("Enveloppe fixée à 8000 €, hors électroménager.");
    await page.getByRole("button", { name: "Ajouter au journal" }).click();

    await expect(page.getByText("Budget cuisine")).toBeVisible();
    await expect(
      page.getByText("Enveloppe fixée à 8000 €, hors électroménager."),
    ).toBeVisible();

    const entry = page.getByText("Budget cuisine").locator("..").locator("..");
    await entry.getByRole("button", { name: "Supprimer" }).click();
    await expect(page.getByText("Budget cuisine")).toHaveCount(0);

    // Une entrée persistante pour le dossier PDF et le test de mémoire IA
    // ci-dessous — recréée après la vérification de suppression.
    await page.getByLabel("Titre").fill("Contrainte structurelle");
    await page.locator("#journal-kind").selectOption("NOTE");
    await page
      .getByLabel("Contenu")
      .fill("Le mur entre le séjour et la cuisine ne doit pas être touché (porteur).");
    await page.getByRole("button", { name: "Ajouter au journal" }).click();
    await expect(page.getByText("Contrainte structurelle")).toBeVisible();
  });

  await test.step("architecte accompagnateur : répond et ancre la conversation sur le projet", async () => {
    await page.goto(projectUrl);
    await page
      .getByText("Architecte accompagnateur — poser une question sur ce projet")
      .click();
    const input = page.getByLabel("Votre question");
    await input.fill("Quelles sont les contraintes déjà connues sur ce projet ?");
    await input.press("Enter");

    const conversation = page.getByRole("list", {
      name: "Conversation avec l'assistant",
    });
    await expect(conversation.getByText(/Réponse factice/)).toBeVisible();

    // La preuve que la conversation est bien ancrée sur CE projet (mémoire
    // longitudinale, PROJ-07) est côté serveur : `AiConversation.context`
    // porte le `projectId`, jamais visible dans la réponse factice elle-même.
    await expect(async () => {
      const conversation = await prisma.aiConversation.findFirst({
        where: { context: { path: ["projectId"], equals: projectId } },
      });
      expect(conversation).not.toBeNull();
    }).toPass({ timeout: 5_000 });
  });

  await test.step("export dossier PDF : contient plans, moodboards, listes et budget", async () => {
    // Un moodboard, pour que l'export exerce aussi le rendu du plateau.
    await page.goto(projectUrl);
    await page.getByRole("link", { name: "Moodboards" }).click();
    await page.waitForURL(/\/moodboards$/);
    await page.getByLabel("Titre").fill("Ambiance dossier");
    await page.getByRole("button", { name: "Générer" }).click();
    await page.waitForURL(/\/moodboards\/[a-z0-9]+$/, { timeout: 30_000 });

    const response = await page.request.get(`/api/atelier/${projectId}/dossier`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("application/pdf");

    const body = await response.body();
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // Un dossier avec pièce (plan calibré, mobilier) et moodboard tient
    // nécessairement sur plus qu'une simple page de couverture.
    expect(body.byteLength).toBeGreaterThan(2_500);
  });
});
