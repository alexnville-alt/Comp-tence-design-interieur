import { prisma } from "@atelier/db";
import { BUDGET_TIERS, LIB_CATEGORIES } from "@atelier/domain";
import { expect, test } from "@playwright/test";
import { searchLibrary } from "../src/features/library/data";
import { completeOnboarding, signUp } from "./helpers";

/**
 * Bibliothèque (docs/05 M7). Un seul compte pour tout le fichier — même
 * raison que `photos.spec.ts` (M6) : la limitation de débit d'inscription
 * (`RATE_LIMITS.signup`, `src/lib/rate-limit.ts`) est partagée par toute la
 * suite E2E en local et en CI (un seul worker, une seule IP).
 */

const SYNTHETIC_PREFIX = "perf-test-";
// Le corpus réel compte 54 fiches (docs/05 M7 vise ≥ 300 à terme) : ce
// complément synthétique, jamais commité comme contenu, permet de vérifier
// le critère d'acceptation « répond en < 150 ms sur 300 fiches » à l'échelle
// réellement visée plutôt que sur le seul corpus actuel.
const SYNTHETIC_COUNT = 250;

test.afterEach(async () => {
  await prisma.libraryItem.deleteMany({
    where: { slug: { startsWith: SYNTHETIC_PREFIX } },
  });
});

test("recherche, facettes, graphe de relations et favoris", async ({ page }) => {
  test.setTimeout(60_000);
  await signUp(page);
  await completeOnboarding(page);

  await test.step("recherche plein texte trouve une fiche par mot-clé", async () => {
    await page.goto("/bibliotheque");
    await page.getByLabel("Rechercher").fill("chêne");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(page.getByRole("link", { name: /Chêne huilé/ })).toBeVisible();
  });

  await test.step("les facettes filtrent par catégorie, budget et pièce", async () => {
    await page.goto("/bibliotheque?categorie=WOOD");
    await expect(page.getByRole("link", { name: /Chêne huilé/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Marbre de Carrare/ })).not.toBeVisible();

    await page.goto("/bibliotheque?piece=KITCHEN");
    await expect(page.getByRole("link", { name: /Cuisine en L/ })).toBeVisible();

    await page.goto("/bibliotheque?sansTravaux=1");
    await expect(page.getByRole("link", { name: /Monstera/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cuisine en L/ })).not.toBeVisible();
  });

  await test.step("la fiche détail affiche le graphe de relations et bascule un favori", async () => {
    await page.goto("/bibliotheque/chene-huile");
    await expect(page.getByRole("heading", { name: "Chêne huilé" })).toBeVisible();

    // Lien externe (post-M12, même mécanisme que les fiches « intérieurs
    // célèbres ») : n'a de sens que pour un concept identifiable (une essence
    // de bois ici) — jamais une image hébergée par l'app elle-même.
    await expect(
      page.getByRole("link", { name: "Voir des photos et en savoir plus" }),
    ).toHaveAttribute("href", "https://fr.wikipedia.org/wiki/Chêne");

    // Symétrique (PAIRS_WITH) et asymétrique (CHEAPER_ALT) — les deux
    // formes de relation déclarées dans le contenu réel (docs/05 M7).
    await expect(page.getByText("S'associe bien avec")).toBeVisible();
    const pairedLink = page.getByRole("link", { name: /Blanc cassé/ });
    await expect(pairedLink).toBeVisible();
    await expect(page.getByText("Alternative moins chère")).toBeVisible();
    await expect(page.getByRole("link", { name: /Stratifié HPL/ })).toBeVisible();

    const favoriteButton = page.getByRole("button", { name: /Ajouter aux favoris/ });
    await expect(favoriteButton).toBeVisible();
    await favoriteButton.click();
    await expect(page.getByRole("button", { name: /Retirer des favoris/ })).toBeVisible();

    // La relation mène bien à l'autre fiche, pas à un lien mort.
    await pairedLink.click();
    await expect(page.getByRole("heading", { name: "Blanc cassé" })).toBeVisible();

    await page.goto("/bibliotheque/favoris");
    await expect(page.getByRole("heading", { name: "Mes favoris" })).toBeVisible();
    await expect(page.getByText("Chêne huilé")).toBeVisible();
  });

  await test.step("recherche plein texte : < 150 ms sur 300 fiches (docs/05 M7)", async () => {
    await prisma.libraryItem.createMany({
      data: Array.from({ length: SYNTHETIC_COUNT }, (_, i) => ({
        slug: `${SYNTHETIC_PREFIX}${i}`,
        category: LIB_CATEGORIES[i % LIB_CATEGORIES.length]!,
        name: `Fiche de test perf ${i}`,
        summary: `Résumé synthétique numéro ${i}, utilisé uniquement pour le test de charge.`,
        description:
          `Description synthétique numéro ${i} : contient le mot chêne pour être ` +
          "trouvable par la recherche plein texte pendant le test de charge.",
        pros: ["Avantage synthétique"],
        cons: ["Inconvénient synthétique"],
        budgetTier: BUDGET_TIERS[i % BUDGET_TIERS.length]!,
        maintenance: "Entretien synthétique.",
        mistakes: ["Erreur synthétique"],
        attributes: {},
      })),
    });

    const total = await prisma.libraryItem.count();
    expect(total).toBeGreaterThanOrEqual(300);

    const start = performance.now();
    const results = await searchLibrary({ query: "chêne" });
    const elapsedMs = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(150);
  });
});
