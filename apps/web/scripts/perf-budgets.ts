/**
 * Budgets de performance (docs/01 §4, M12) : « LCP < 2,5 s et INP < 200 ms
 * sur 4G/mobile milieu de gamme, pages leçon et tableau de bord ».
 *
 * Lighthouse ne mesure pas l'INP directement — c'est une métrique de terrain
 * (CrUX), pas de laboratoire. Le Total Blocking Time (TBT) en est le proxy
 * de laboratoire standard (voir web.dev/tbt) : c'est lui qui est comparé au
 * seuil de 200 ms.
 *
 * Une vraie session authentifiée est nécessaire pour auditer le tableau de
 * bord et une leçon — pas de mock : on crée un compte réel via Playwright
 * (même chemin que les tests E2E) puis on réutilise son cookie de session
 * pour les requêtes Lighthouse.
 *
 * Seules les deux pages explicitement nommées par docs/01 (tableau de bord,
 * lecteur de leçon) sont bloquantes ; les autres sont mesurées et rapportées
 * à titre indicatif — même distinction que docs/02 §7 (« ⚠️ puis bloquant »).
 */
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:3100";
const LCP_BUDGET_MS = 2500;
const TBT_BUDGET_MS = 200;

/**
 * `PLAYWRIGHT_CHROMIUM_PATH` est l'échappatoire de ce sandbox (voir
 * `playwright.config.ts`) pour un Chromium préinstallé non téléchargeable ;
 * en CI, où le Chromium de Playwright est correctement installé,
 * `chromium.executablePath()` résout le bon binaire sans configuration —
 * c'est ce même chemin qu'on réutilise pour `chrome-launcher`, pour ne
 * jamais dépendre d'une seconde installation de Chrome.
 */
const CHROME_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? chromium.executablePath();

interface PageTarget {
  path: string;
  label: string;
  authenticated: boolean;
  blocking: boolean;
}

const TARGETS: PageTarget[] = [
  { path: "/", label: "Accueil", authenticated: false, blocking: false },
  { path: "/connexion", label: "Connexion", authenticated: false, blocking: false },
  { path: "/inscription", label: "Inscription", authenticated: false, blocking: false },
  {
    path: "/tableau-de-bord",
    label: "Tableau de bord",
    authenticated: true,
    blocking: true,
  },
  { path: "/parcours", label: "Parcours", authenticated: true, blocking: false },
  {
    path: "/parcours/decouverte/notions-generales/quest-ce-qu-un-espace-reussi",
    label: "Lecteur de leçon",
    authenticated: true,
    blocking: true,
  },
  { path: "/atelier", label: "Atelier — liste", authenticated: true, blocking: false },
  { path: "/bibliotheque", label: "Bibliothèque", authenticated: true, blocking: false },
  {
    path: "/interieurs-celebres",
    label: "Intérieurs célèbres",
    authenticated: true,
    blocking: false,
  },
  { path: "/defis", label: "Défis", authenticated: true, blocking: false },
];

async function authenticatedCookieHeader(): Promise<string> {
  const browser = await chromium.launch({ executablePath: CHROME_PATH });
  const context = await browser.newContext({ baseURL: APP_URL });
  const page = await context.newPage();

  const email = `perf-${Date.now()}@exemple.test`;
  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill("Perf");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("le chat dort sur le radiateur");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/bienvenue/);

  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Passer le diagnostic" }).click();
  await page.getByRole("button", { name: "Commencer mon parcours" }).click();
  await page.waitForURL(/\/tableau-de-bord/);

  const cookies = await context.cookies();
  await browser.close();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

interface Result {
  target: PageTarget;
  lcpMs: number;
  tbtMs: number;
  cls: number;
  performanceScore: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

async function auditPageOnce(
  chrome: chromeLauncher.LaunchedChrome,
  cookie: string | null,
  target: PageTarget,
): Promise<Result> {
  const runnerResult = await lighthouse(`${APP_URL}${target.path}`, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    formFactor: "mobile",
    // Émulation par défaut de Lighthouse en mode mobile : CPU 4x ralenti,
    // réseau simulé proche d'un 4G milieu de gamme (docs/01 §4).
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 2.625 },
    ...(target.authenticated && cookie ? { extraHeaders: { Cookie: cookie } } : {}),
  });

  if (!runnerResult)
    throw new Error(`Lighthouse n'a produit aucun résultat pour ${target.path}`);
  const { audits, categories } = runnerResult.lhr;

  return {
    target,
    lcpMs: audits["largest-contentful-paint"]!.numericValue ?? Number.NaN,
    tbtMs: audits["total-blocking-time"]!.numericValue ?? Number.NaN,
    cls: audits["cumulative-layout-shift"]!.numericValue ?? Number.NaN,
    performanceScore: (categories.performance?.score ?? 0) * 100,
  };
}

/**
 * Les pages bloquantes sont mesurées 3 fois et on retient la médiane : les
 * mesures Lighthouse sont notoirement bruitées sur un CPU partagé (machine
 * de CI virtualisée) — une seule exécution ferait dépendre le succès de la
 * CI du bruit, pas d'une vraie régression.
 */
async function auditPage(
  chrome: chromeLauncher.LaunchedChrome,
  cookie: string | null,
  target: PageTarget,
): Promise<Result> {
  if (!target.blocking) return auditPageOnce(chrome, cookie, target);

  // Séquentiel, pas `Promise.all` : les runs concurrents partageraient le
  // même port de débogage Chrome et se perturberaient mutuellement.
  const runs: Result[] = [];
  for (let i = 0; i < 3; i++) {
    runs.push(await auditPageOnce(chrome, cookie, target));
  }

  return {
    target,
    lcpMs: median(runs.map((r) => r.lcpMs)),
    tbtMs: median(runs.map((r) => r.tbtMs)),
    cls: median(runs.map((r) => r.cls)),
    performanceScore: median(runs.map((r) => r.performanceScore)),
  };
}

async function main() {
  console.warn(`Budgets de performance — ${APP_URL}\n`);

  const needsAuth = TARGETS.some((t) => t.authenticated);
  const cookie = needsAuth ? await authenticatedCookieHeader() : null;

  const chrome = await chromeLauncher.launch({
    chromePath: CHROME_PATH,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  const results: Result[] = [];
  try {
    for (const target of TARGETS) {
      const result = await auditPage(chrome, cookie, target);
      results.push(result);
      const status =
        result.lcpMs <= LCP_BUDGET_MS && result.tbtMs <= TBT_BUDGET_MS ? "✅" : "❌";
      console.warn(
        `${status} ${target.label.padEnd(20)} LCP ${result.lcpMs.toFixed(0).padStart(5)} ms · ` +
          `TBT ${result.tbtMs.toFixed(0).padStart(4)} ms · CLS ${result.cls.toFixed(3)} · ` +
          `score ${result.performanceScore.toFixed(0)}`,
      );
    }
  } finally {
    chrome.kill();
  }

  const failures = results.filter(
    (r) => r.target.blocking && (r.lcpMs > LCP_BUDGET_MS || r.tbtMs > TBT_BUDGET_MS),
  );

  console.warn(
    `\nBudgets bloquants : LCP < ${LCP_BUDGET_MS} ms, TBT < ${TBT_BUDGET_MS} ms ` +
      `(proxy de laboratoire pour INP) sur « tableau de bord » et « lecteur de leçon ».`,
  );

  if (failures.length > 0) {
    console.error(
      `\n${failures.length} page(s) hors budget : ${failures.map((f) => f.target.label).join(", ")}`,
    );
    process.exit(1);
  }

  console.warn("\nTous les budgets bloquants sont tenus.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
