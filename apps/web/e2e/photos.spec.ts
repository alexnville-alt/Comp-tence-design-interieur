import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomFillSync } from "node:crypto";
import { prisma } from "@atelier/db";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Analyse photo (docs/05 M6). `AI_PROVIDER=fake` en E2E — la photo de test
 * (`fixtures/salon.jpg`) est un vrai fichier JPEG, traité par le vrai
 * pipeline serveur (S3, `sharp`, SHA-256) ; seule la réponse d'analyse est
 * simulée.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "salon.jpg");

/**
 * Le cache d'analyse est délibérément global (déduplication par SHA-256 du
 * contenu, pas par utilisateur — voir analysis-actions.ts). Un fichier de
 * fixture statique entrerait donc en collision avec lui-même d'une exécution
 * à l'autre sur une base de développement persistante (le SHA-256 d'un run
 * précédent resterait en cache), faussant le comptage "usageBefore" du test
 * ci-dessous. Un JPEG généré avec un contenu aléatoire à chaque exécution
 * garantit un SHA-256 jamais vu.
 */
async function randomJpegBuffer(): Promise<Buffer> {
  const width = 480;
  const height = 360;
  const raw = Buffer.alloc(width * height * 3);
  randomFillSync(raw);
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
    .toBuffer();
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

test("téléverser une photo l'analyse, affiche repères et améliorations, et réutilise le cache SHA-256", async ({
  page,
}) => {
  // Un seul compte pour tout le fichier (au lieu d'un par test) : la
  // limitation de débit d'inscription (`RATE_LIMITS.signup`, 30/heure/IP,
  // src/lib/rate-limit.ts) est partagée par toute la suite E2E en local et
  // en CI (un seul worker, une seule IP) — chaque signUp() en plus compte.
  test.setTimeout(90_000);
  await signUp(page);
  await completeOnboarding(page);
  await createProjectAndRoom(page);

  await page.getByRole("link", { name: "Analyser une photo" }).click();
  await page.waitForURL(/\/photos$/);
  const photosUrl = page.url();

  await test.step("téléversement et analyse : repères, améliorations, passerelle atelier", async () => {
    await page.getByLabel("Analyser une photo de cette pièce").setInputFiles(FIXTURE);
    await page.waitForURL(/\/photos\/[a-z0-9]+$/, { timeout: 30_000 });

    await expect(page.getByText("Style détecté")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Problèmes repérés" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Améliorations proposées" }),
    ).toBeVisible();

    const marker = page.getByRole("link", { name: /Voir le problème 1/ });
    await expect(marker).toBeVisible();
    await marker.click();
    await expect(page).toHaveURL(/#probleme-1$/);

    const openInAtelier = page.getByRole("link", { name: "Ouvrir dans l'atelier" });
    await expect(openInAtelier).toBeVisible();
    await openInAtelier.click();
    await expect(page).toHaveURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);
  });

  await test.step("réanalyser la même photo réutilise le cache SHA-256 : aucun appel IA supplémentaire", async () => {
    const cacheFixture = {
      name: "salon-cache.jpg",
      mimeType: "image/jpeg",
      buffer: await randomJpegBuffer(),
    };

    await page.goto(photosUrl);
    const usageBefore = await prisma.aiUsage.count({
      where: { feature: "PHOTO_ANALYSIS" },
    });

    await page
      .getByLabel("Analyser une photo de cette pièce")
      .setInputFiles(cacheFixture);
    await page.waitForURL(/\/photos\/[a-z0-9]+$/, { timeout: 30_000 });
    const usageAfterFirst = await prisma.aiUsage.count({
      where: { feature: "PHOTO_ANALYSIS" },
    });
    expect(usageAfterFirst).toBe(usageBefore + 1);

    await page.goto(photosUrl);
    await page
      .getByLabel("Analyser une photo de cette pièce")
      .setInputFiles(cacheFixture);
    await page.waitForURL(/\/photos\/[a-z0-9]+$/, { timeout: 30_000 });

    const usageAfterSecond = await prisma.aiUsage.count({
      where: { feature: "PHOTO_ANALYSIS" },
    });
    expect(usageAfterSecond).toBe(usageAfterFirst);

    // Les deux analyses de CACHE_FIXTURE existent bien (historique), même si
    // la seconde n'a coûté aucun appel IA — la déduplication porte sur
    // l'appel, pas l'historique. Plus l'analyse de FIXTURE du step précédent.
    await page.goto(photosUrl);
    await expect(page.locator('a[href*="/photos/"]')).toHaveCount(3);
  });
});
