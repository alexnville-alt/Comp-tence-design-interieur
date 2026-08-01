import AxeBuilder from "@axe-core/playwright";
import { prisma } from "@atelier/db";
import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Couche IA (docs/05 M5) : chat en streaming, garde-fous, quota, correction
 * d'un cas ouvert. `AI_PROVIDER=fake` en E2E (voir `.env`, `.github/workflows/
 * ci.yml`) — ces tests exercent la vraie intégration serveur (routes, Server
 * Actions, Prisma) sans jamais appeler un vrai fournisseur.
 */

const LECON_URL =
  "/parcours/decouverte/notions-generales/les-dix-erreurs-qui-ruinent-une-piece";
const EVALUATION_URL = "/parcours/decouverte/evaluation";

test("chat : une question ordinaire obtient une réponse de l'assistant, sans souris nécessaire", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(LECON_URL);

  await page.getByText("Assistant IA — poser une question sur cette leçon").click();
  const input = page.getByLabel("Votre question");
  await input.fill("Comment organiser ce salon ?");
  await input.press("Enter");

  const conversation = page.getByRole("list", { name: "Conversation avec l'assistant" });
  await expect(conversation.getByText(/Réponse factice/)).toBeVisible();
  // `exact: true` : la réponse factice cite aussi la question dans sa
  // propre phrase, donc une correspondance non exacte matcherait les deux
  // bulles (la question elle-même, et la réponse qui la reprend).
  await expect(
    conversation.getByText("Comment organiser ce salon ?", { exact: true }),
  ).toBeVisible();
});

test("chat : une question sur un mur porteur déclenche le renvoi vers un professionnel, sans appel IA", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(LECON_URL);

  await page.getByText("Assistant IA — poser une question sur cette leçon").click();
  const input = page.getByLabel("Votre question");
  await input.fill("Est-ce que ce mur est porteur ?");
  await input.press("Enter");

  const conversation = page.getByRole("list", { name: "Conversation avec l'assistant" });
  await expect(conversation.getByText(/professionnel/)).toBeVisible();
  // La réponse factice a un marqueur fixe ; son absence prouve que
  // l'adaptateur IA n'a jamais été appelé (AI-09, critère d'acceptation M5).
  await expect(conversation.getByText(/Réponse factice/)).toHaveCount(0);
});

test("chat : quota mensuel atteint → message clair, aucune erreur technique", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page);
  await completeOnboarding(page);

  // Épuise le quota par défaut (`Profile.aiMonthlyQuota`, 200) par des appels
  // directs à la route plutôt qu'en dérobant 200 fois l'IHM : chaque appel
  // passe par le même code serveur qu'un message envoyé depuis le panneau.
  for (let i = 0; i < 200; i++) {
    const response = await page.request.post("/api/ai/chat", {
      data: { message: `Question anodine numéro ${i}` },
    });
    expect(response.ok()).toBe(true);
  }

  const response = await page.request.post("/api/ai/chat", {
    data: { message: "Une question de plus, après épuisement du quota." },
  });
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toContain('"quotaExceeded":true');
  expect(body.toLowerCase()).toContain("quota");
});

test("cas ouvert (OPEN_CASE) : le barème est visible avant de répondre, la correction rend une note et un retour en 3 parties", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(EVALUATION_URL);

  const openCase = page.locator('[data-exercise-slug="eval-decouverte-cas-salon-nord"]');
  await expect(
    openCase.getByText("Barème de correction (visible avant de répondre)"),
  ).toBeVisible();
  await expect(openCase.getByText(/Réponse à la contrainte posée/)).toBeVisible();

  await openCase
    .getByLabel("Votre réponse")
    .fill(
      "Je restaurerais la cheminée comme point focal assumé, quitte à la rouvrir, " +
        "car elle structure déjà la lecture de la pièce mieux qu'un nouveau point focal côté fenêtre.",
    );
  await openCase.getByRole("button", { name: "Envoyer pour correction" }).click();

  await expect(openCase.getByText(/^Note :/)).toBeVisible();
  await expect(openCase.getByText("Points forts")).toBeVisible();
  await expect(openCase.getByText("Axes d'amélioration")).toBeVisible();
  await expect(openCase.getByText(/Règle à réviser/)).toBeVisible();
});

test("administration IA : un apprenant ordinaire ne peut pas y accéder", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  const response = await page.goto("/administration/ia");
  // `requireAdmin()` répond par `notFound()`, pas une redirection : la page
  // ne doit même pas laisser deviner qu'elle existe (docs/02 §6).
  expect(response?.status()).toBe(404);
});

test("administration IA : un administrateur voit les coûts agrégés par fonctionnalité et par apprenant", async ({
  page,
}) => {
  const email = await signUp(page);
  await completeOnboarding(page);

  // La promotion en administrateur n'a délibérément aucun chemin en libre-
  // service (docs/02 §6) : on la simule ici comme le ferait une opération
  // manuelle, pour vérifier ce que voit ensuite un vrai compte ADMIN.
  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });

  // Un appel réel pour que le tableau ait quelque chose à agréger.
  await page.request.post("/api/ai/chat", { data: { message: "Bonjour" } });

  await page.goto("/administration/ia");
  await expect(page.getByRole("heading", { name: /Administration IA/ })).toBeVisible();
  await expect(page.getByText("Chat pédagogique")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const graves = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(graves).toEqual([]);
});
