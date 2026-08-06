import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Contenu transverse (docs/06 §4, M11) : intérieurs célèbres, projets
 * jalons, défis hebdomadaires. `AI_PROVIDER=fake` en E2E — la correction
 * d'un défi exerce la vraie intégration serveur (Server Action, Prisma,
 * quota) sans jamais appeler un vrai fournisseur, exactement comme les cas
 * ouverts (`ia.spec.ts`, M5).
 */

test("intérieurs célèbres : la liste mène à une fiche d'analyse complète", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/interieurs-celebres");
  await expect(page.getByRole("heading", { name: "Intérieurs célèbres" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Villa Savoye/ })).toBeVisible();

  await page.getByRole("link", { name: /Villa Savoye/ }).click();
  await expect(page.getByRole("heading", { name: "Villa Savoye" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Intention de conception" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "À retenir" })).toBeVisible();

  // Lien externe (post-M12) : jamais une image hébergée par l'app elle-même
  // (voir la note de périmètre du README) — un lien sortant, clairement
  // identifié, vers une page qui présente le lieu.
  const externalLink = page.getByRole("link", {
    name: "Voir des photos et en savoir plus",
  });
  await expect(externalLink).toHaveAttribute(
    "href",
    "https://fr.wikipedia.org/wiki/Villa_Savoye",
  );
  await expect(externalLink).toHaveAttribute("target", "_blank");
  await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
});

test("projets jalons : la liste mène au brief et aux critères d'évaluation", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/projets-jalons");
  await expect(page.getByRole("heading", { name: "Projets jalons" })).toBeVisible();

  await page.getByRole("link", { name: /Projet jalon A/ }).click();
  await expect(page.getByRole("heading", { name: "Le brief" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Livrables attendus" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Critères d'évaluation" }),
  ).toBeVisible();
});

test("défis : le barème est visible avant de répondre, la correction rend une note et le meilleur score reste affiché", async ({
  page,
}) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/defis");
  await expect(page.getByRole("heading", { name: "Défis hebdomadaires" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /500 € pour transformer une entrée/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: /500 € pour transformer une entrée/ }).click();
  await expect(
    page.getByText("Barème de correction (visible avant de répondre)"),
  ).toBeVisible();

  await page
    .getByLabel("Votre réponse")
    .fill(
      "Je repeindrais l'entrée dans une teinte plus claire et ajouterais une console " +
        "étroite avec un miroir au-dessus pour agrandir visuellement l'espace, tout en " +
        "gardant la circulation dégagée vers le salon.",
    );
  await page.getByRole("button", { name: "Envoyer pour correction" }).click();

  await expect(page.getByText(/^Note :/)).toBeVisible();
  await expect(page.getByText("Points forts")).toBeVisible();
  await expect(page.getByText("Axes d'amélioration")).toBeVisible();

  await page.goto("/defis");
  await expect(page.getByText(/Meilleur score : \d+ %/)).toBeVisible();
});
