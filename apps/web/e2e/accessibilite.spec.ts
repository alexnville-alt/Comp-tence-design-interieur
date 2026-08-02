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
  { url: "/politique-de-confidentialite", nom: "politique de confidentialité" },
  { url: "/cgu", nom: "conditions générales d'utilisation" },
  { url: "/accessibilite", nom: "déclaration d'accessibilité" },
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

test("le lien d'évitement déplace réellement le focus clavier, pas seulement le défilement", async ({
  page,
}) => {
  // Un piège classique (M12) : un lien d'évitement qui pointe vers une ancre
  // sans `tabIndex={-1}` fait défiler la page jusqu'à la cible sans jamais y
  // déplacer le focus clavier réel — invisible à axe-core, qui ne teste pas
  // la navigation clavier, seul un parcours manuel (ou simulé ici) le révèle.
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Aller au contenu principal" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenu")).toBeFocused();
});

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

  // Premier envoi d'une photo à l'assistant IA pour ce compte (M12,
  // docs/01 §9) : le consentement explicite est demandé avant tout appel.
  await expect(
    page.getByRole("button", { name: "J'accepte et je continue" }),
  ).toBeVisible();
  await auditer(page, "atelier — consentement premier envoi de photo à l'IA");
  await page.getByRole("button", { name: "J'accepte et je continue" }).click();
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

  await page.goto("/interieurs-celebres");
  await auditer(page, "intérieurs célèbres — liste");
  await page.getByRole("link", { name: /Villa Savoye/ }).click();
  await auditer(page, "intérieurs célèbres — fiche détail");

  await page.goto("/projets-jalons");
  await auditer(page, "projets jalons — liste");
  await page.getByRole("link", { name: /Projet jalon A/ }).click();
  await auditer(page, "projets jalons — détail");

  await page.goto("/defis");
  await auditer(page, "défis — liste");
  await page.getByRole("link", { name: /500 € pour transformer une entrée/ }).click();
  await auditer(page, "défis — détail, avant réponse");

  await page.goto("/profil");
  await auditer(page, "profil");
});

test("accessibilité — viewport mobile (barre de navigation inférieure)", async ({
  page,
}) => {
  // Toute la suite ci-dessus s'exécute en résolution bureau (projet
  // `chromium` = Desktop Chrome) : la barre latérale est donc seule exposée
  // à l'arbre d'accessibilité (`hidden md:flex`), la barre inférieure mobile
  // (`md:hidden`) n'a jamais été auditée. Un `<nav>` distinct existe pour
  // chaque taille — les deux partagent le même `aria-label`, sans conflit
  // réel puisque `display: none` retire celui qui n'est pas affiché de
  // l'arbre d'accessibilité, mais seul un audit à cette largeur le vérifie.
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await signUp(page);
  await auditer(page, "mobile — onboarding");
  await completeOnboarding(page);
  await auditer(page, "mobile — tableau de bord");

  const bottomNav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "Parcours" })).toBeVisible();
});
