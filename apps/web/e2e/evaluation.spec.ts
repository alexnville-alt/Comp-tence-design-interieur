import { expect, test, type Locator, type Page } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Exercices et évaluation de fin de niveau (docs/05 M3).
 *
 * Ces tests répondent aux exercices réels du niveau 1 (`content/niveaux/
 * decouverte/`) — mêmes questions, mêmes bonnes réponses que verrait un
 * apprenant.
 */

const LECON_ERREURS_URL =
  "/parcours/decouverte/notions-generales/les-dix-erreurs-qui-ruinent-une-piece";
const EVALUATION_URL = "/parcours/decouverte/evaluation";

test("un quiz vrai/faux se corrige immédiatement, avec l'explication", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(LECON_ERREURS_URL);

  const exercise = page.locator('[data-exercise-slug="verite-erreur-tapis"]');
  await exercise.getByRole("button", { name: "Vrai" }).click();

  await expect(exercise.getByText(/^Correct —/)).toBeVisible();
  await expect(exercise.getByText(/tapis bien dimensionné touche/)).toBeVisible();
});

/** Sélectionne, pour chaque `<select>` d'un exercice QUIZ_MATCH, l'option portant `label`. */
async function matchPairs(container: Locator, rightLabels: string[]): Promise<void> {
  const selects = container.locator("select");
  for (let i = 0; i < rightLabels.length; i++) {
    await selects.nth(i).selectOption({ label: rightLabels[i]! });
  }
}

/** Trie par échanges adjacents (boutons Monter/Descendre) jusqu'à retrouver l'ordre 0..n-1. */
async function solveOrderExercise(container: Locator, itemCount: number): Promise<void> {
  for (let pass = 0; pass < itemCount; pass++) {
    for (let position = 0; position < itemCount - 1; position++) {
      const items = container.locator("li");
      const current = Number(
        await items.nth(position).getAttribute("data-original-index"),
      );
      const next = Number(
        await items.nth(position + 1).getAttribute("data-original-index"),
      );
      if (current > next) {
        await items
          .nth(position + 1)
          .getByRole("button", { name: /^Monter/ })
          .click();
      }
    }
  }
}

async function passAssessment(page: Page): Promise<void> {
  await page.goto(EVALUATION_URL);

  const mcq = page.locator('[data-exercise-slug="eval-decouverte-criteres"]');
  await mcq.getByRole("checkbox", { name: "La fonction" }).check();
  await mcq.getByRole("button", { name: "Valider" }).click();

  const trueFalse = page.locator('[data-exercise-slug="eval-decouverte-point-focal"]');
  await trueFalse.getByRole("button", { name: "Faux" }).click();

  const match = page.locator('[data-exercise-slug="eval-decouverte-vocabulaire"]');
  await matchPairs(match, [
    "Une portion de la pièce dédiée à un usage précis",
    "L'ensemble cohérent des couleurs et matières utilisées",
    "Les trajets empruntés pour se déplacer",
  ]);
  await match.getByRole("button", { name: "Valider" }).click();

  const order = page.locator('[data-exercise-slug="eval-decouverte-grille-lecture"]');
  await solveOrderExercise(order, 5);
  await order.getByRole("button", { name: "Valider l'ordre" }).click();

  const hotspot = page.locator('[data-exercise-slug="eval-decouverte-hotspot"]');
  await hotspot.getByRole("checkbox", { name: "Cheminée" }).check();
  await hotspot.getByRole("button", { name: "Valider" }).click();

  const referentiel = page.locator('[data-exercise-slug="eval-decouverte-referentiel"]');
  await referentiel
    .getByRole("checkbox", { name: "Une constante de votre référentiel" })
    .check();
  await referentiel.getByRole("button", { name: "Valider" }).click();

  const mesures = page.locator('[data-exercise-slug="eval-decouverte-mesures"]');
  await mesures.getByRole("button", { name: "Faux" }).click();

  // Cas ouvert (OPEN_CASE, M5) : corrigé par l'IA (l'adaptateur factice en
  // E2E, AI_PROVIDER=fake) — la note s'affiche de façon asynchrone.
  const openCase = page.locator('[data-exercise-slug="eval-decouverte-cas-salon-nord"]');
  await openCase
    .getByLabel("Votre réponse")
    .fill(
      "Je restaurerais la cheminée comme point focal assumé, quitte à la rouvrir, " +
        "car elle structure déjà la lecture de la pièce mieux qu'un nouveau point focal côté fenêtre.",
    );
  await openCase.getByRole("button", { name: "Envoyer pour correction" }).click();
  await expect(openCase.getByText(/^Note :/)).toBeVisible();

  await page.getByRole("button", { name: "Valider l'évaluation" }).click();
}

test("réussir l'évaluation de niveau déverrouille le niveau suivant", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await passAssessment(page);

  await expect(page.getByText(/Niveau validé/)).toBeVisible();

  await page.goto("/parcours");
  const fondamentaux = page.locator("li", { hasText: "Fondamentaux" });
  await expect(fondamentaux.getByText("Verrouillé")).toHaveCount(0);
  await expect(fondamentaux.locator("a")).toBeVisible();
});

test("échouer l'évaluation ne verrouille rien et invite à réviser", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto(EVALUATION_URL);

  // Répond délibérément de travers au premier exercice, puis tente de
  // valider sans répondre aux autres.
  const mcq = page.locator('[data-exercise-slug="eval-decouverte-criteres"]');
  await mcq.getByRole("checkbox", { name: "L'identité" }).check();
  await mcq.getByRole("button", { name: "Valider" }).click();

  await page.getByRole("button", { name: "Valider l'évaluation" }).click();
  await expect(
    page.getByText("Répondez à toutes les questions avant de valider."),
  ).toBeVisible();

  await page.goto("/parcours");
  const fondamentaux = page.locator("li", { hasText: "Fondamentaux" });
  await expect(fondamentaux.getByText("Verrouillé")).toBeVisible();
});
