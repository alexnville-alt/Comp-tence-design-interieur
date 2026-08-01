import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright.
 *
 * Les tests s'exécutent contre le **build de production** (`next start`) et non
 * `next dev` : le mode développement a un comportement différent (double rendu
 * en mode strict, absence d'optimisations), et on veut valider ce qui sera
 * réellement déployé.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // les tests partagent une base : ordre déterministe
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    // `||` et non `??` : une variable définie mais vide doit être traitée
    // comme absente, pas comme une URL de base vide.
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3100",
    trace: "on-first-retry",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Échappatoire pour les environnements où le Chromium fourni par
        // Playwright n'est pas téléchargeable (conteneurs de développement
        // avec un navigateur préinstallé). En CI, la variable est absente et
        // Playwright utilise son propre navigateur — comportement standard.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],

  // Spread conditionnel plutôt que `webServer: undefined` : avec
  // `exactOptionalPropertyTypes`, affecter explicitement `undefined` à une
  // propriété optionnelle est une erreur de type — et c'est voulu, car les
  // deux situations (« absent » et « présent mais indéfini ») n'ont pas le
  // même sens.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "dotenv -e ../../.env -- next start --port 3100 --hostname 127.0.0.1",
          url: "http://127.0.0.1:3100/api/health",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
        },
      }),
});
