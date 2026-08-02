import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

/**
 * En-têtes de sécurité (docs/02 §6, M12).
 *
 * La CSP (`src/middleware.ts`) est stricte par construction (nonce +
 * `strict-dynamic`, pas de `'unsafe-inline'` sur les scripts) : le risque
 * n'est pas qu'elle laisse passer une injection, mais qu'elle bloque
 * silencieusement une ressource légitime — un `<script>`, une police, ou la
 * requête `fetch` du dépôt direct navigateur → S3 (M6). Un tel blocage
 * n'échoue aucune assertion Playwright ordinaire ; seul l'événement DOM
 * `securitypolicyviolation` le révèle.
 */

async function collectCspViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
        `${e.violatedDirective}: ${e.blockedURI}`,
      );
    });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
    );
}

test("les en-têtes de sécurité sont posés sur chaque réponse", async ({ page }) => {
  const response = await page.goto("/connexion");
  const headers = response!.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("aucune violation CSP sur le parcours principal (inscription → atelier → bibliothèque → contenu M11)", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const getViolations = await collectCspViolations(page);

  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/atelier");
  await page.getByLabel("Nouveau projet").fill("Vérification CSP");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+$/);
  await page.getByLabel("Nouvelle pièce").fill("Salon");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForURL(/\/atelier\/[a-z0-9]+\/[a-z0-9]+$/);

  await page.goto("/bibliotheque");
  await page.goto("/interieurs-celebres");
  await page.goto("/defis");
  await page.goto("/tableau-de-bord");

  expect(await getViolations()).toEqual([]);
});
