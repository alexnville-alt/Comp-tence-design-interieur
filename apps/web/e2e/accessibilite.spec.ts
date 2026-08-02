import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_FIXTURE = path.join(__dirname, "fixtures", "salon.jpg");

/**
 * Audit d'accessibilité automatisé (docs/02 §7).
 *
 * axe-core ne détecte qu'environ 30 % des problèmes réels — il ne remplace pas
 * l'audit clavier et lecteur d'écran prévu en M12. Mais il attrape
 * mécaniquement les régressions les plus fréquentes (contraste, libellés
 * manquants, hiérarchie de titres), qui sont justement celles qu'une relecture
 * humaine laisse passer.
 *
 * Chaque page est vérifiée dans les deux thèmes : un contraste correct en
 * clair peut être insuffisant en sombre.
 */

const RULES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function auditer(page: Page, nom: string) {
  const results = await new AxeBuilder({ page }).withTags(RULES).analyze();

  const graves = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    graves,
    `${nom} — violations : ${graves.map((v) => `${v.id} (${v.nodes.length})`).join(", ")}`,
  ).toEqual([]);
}

const PAGES_PUBLIQUES = [
  { url: "/", nom: "accueil" },
  { url: "/inscription", nom: "inscription" },
  { url: "/connexion", nom: "connexion" },
  { url: "/mot-de-passe-oublie", nom: "mot de passe oublié" },
];

for (const { url, nom } of PAGES_PUBLIQUES) {
  test(`accessibilité — ${nom} (clair)`, async ({ page }) => {
    await page.goto(url);
    await auditer(page, nom);
  });

  test(`accessibilité — ${nom} (sombre)`, async ({ page, context }) => {
    await context.addCookies([
      { name: "atelier-theme", value: "DARK", url: "http://127.0.0.1:3100" },
    ]);
    await page.goto(url);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await auditer(page, `${nom} (sombre)`);
  });
}

test("accessibilité — onboarding et zone applicative", async ({ page }) => {
  // Une trentaine d'audits axe-core enchaînés (M2 à M10) — le délai par défaut
  // (30 s) est trop court pour ce parcours complet, pas pour une seule étape.
  test.setTimeout(150_000);
  await signUp(page);
  await auditer(page, "onboarding");

  await completeOnboarding(page);
  await auditer(page, "tableau de bord");

  await page.goto("/parcours");
  await auditer(page, "parcours");

  await page.goto("/parcours/decouverte");
  await auditer(page, "détail de niveau");

  await page.goto("/parcours/decouverte/notions-generales/quest-ce-qu-un-espace-reussi");
  await auditer(page, "lecteur de leçon");
  await page.getByText("Assistant IA — poser une question sur cette leçon").click();
  await auditer(page, "lecteur de leçon — assistant IA ouvert");

  await page.goto(
    "/parcours/decouverte/notions-generales/les-dix-erreurs-qui-ruinent-une-piece",
  );
  await auditer(page, "lecteur de leçon avec exercices");

  await page.goto("/parcours/decouverte/evaluation");
  await auditer(page, "évaluation de niveau");

  await page.goto("/revisions");
  await auditer(page, "révisions");

  await page.goto("/atelier");
  await auditer(page, "atelier — liste des projets");
  await page.getByLabel("Nouveau projet").fill("Mon appartement");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+$/);
  await auditer(page, "atelier — détail de projet");
  await page.getByLabel("Nouvelle pièce").fill("Salon");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);
  await auditer(page, "atelier — éditeur de pièce");

  await page.getByRole("link", { name: "Analyser une photo" }).click();
  await page.waitForURL(/\/photos$/);
  await auditer(page, "atelier — téléversement de photo");
  await page.getByLabel("Analyser une photo de cette pièce").setInputFiles(PHOTO_FIXTURE);
  await page.waitForURL(/\/photos\/[a-z0-9]+$/, { timeout: 30_000 });
  await auditer(page, "atelier — analyse photo");

  // "Liste de mobilier" ne vit que sur l'éditeur de pièce (docs/05 M4/M8),
  // jamais sur la page de détail d'analyse — il faut d'abord repasser par la
  // passerelle "Ouvrir dans l'atelier" (M6), comme `photos.spec.ts`.
  await page.getByRole("link", { name: "Ouvrir dans l'atelier" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);
  await page.getByRole("link", { name: "Liste de mobilier" }).click();
  await page.waitForURL(/\/mobilier$/);
  await auditer(page, "atelier — liste de mobilier");

  const roomUrl = /(.+)\/mobilier$/.exec(page.url())![1]!;
  const projectUrl = roomUrl.replace(/\/[a-z0-9]+$/, "");
  await page.goto(`${projectUrl}/moodboards`);
  await auditer(page, "atelier — liste des moodboards");
  await page.getByLabel("Titre").fill("Ambiance test accessibilité");
  await page.getByRole("button", { name: "Générer" }).click();
  await page.waitForURL(/\/moodboards\/[a-z0-9]+$/, { timeout: 30_000 });
  await auditer(page, "atelier — éditeur de moodboard");

  await page.goto(`${roomUrl}/plan`);
  await auditer(page, "atelier — import et calibrage du plan");

  await page.goto(`${roomUrl}/photos-projet`);
  await auditer(page, "atelier — photos de la pièce (projet personnel)");

  await page.goto(projectUrl);
  await auditer(page, "atelier — page projet (état des pièces, journal, budget)");
  await page
    .getByText("Architecte accompagnateur — poser une question sur ce projet")
    .click();
  await auditer(
    page,
    "atelier — page projet, assistant architecte accompagnateur ouvert",
  );

  await page.goto("/bibliotheque");
  await auditer(page, "bibliothèque — recherche");
  await page.getByLabel("Rechercher").fill("chêne");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await auditer(page, "bibliothèque — résultats de recherche");

  await page.getByRole("link", { name: /Chêne huilé/ }).click();
  await page.waitForURL(/\/bibliotheque\/chene-huile$/);
  await auditer(page, "bibliothèque — fiche détail");

  await page.goto("/bibliotheque/favoris");
  await auditer(page, "bibliothèque — favoris");

  await page.goto("/profil");
  await auditer(page, "profil");
});
