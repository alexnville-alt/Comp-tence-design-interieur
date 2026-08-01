import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastBetweenOklch, oklchToHex, parseOklch, oklchToRgb } from "./oklch";

/**
 * Vérification automatisée des contrastes des tokens (docs/03 §2.1).
 *
 * Ce test lit directement `tokens.css` plutôt qu'une copie des valeurs :
 * une duplication finirait par diverger, et le test validerait alors des
 * couleurs qui ne sont plus celles du produit.
 *
 * Il détecte une régression de contraste **avant** tout rendu, donc bien avant
 * l'audit axe-core qui, lui, ne s'exécute que sur les pages effectivement
 * couvertes par un test de bout en bout.
 */

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "tokens.css"), "utf8");

/** Extrait les tokens `--nom: oklch(...)` d'un bloc de règle donné. */
function tokensOfSelector(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m").exec(css);
  if (!block?.[1]) throw new Error(`Bloc introuvable dans tokens.css : ${selector}`);

  const tokens: Record<string, string> = {};
  const declaration = /--([a-z0-9-]+)\s*:\s*(oklch\([^;]+\))\s*;/gi;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(block[1])) !== null) {
    tokens[match[1]!] = match[2]!;
  }
  return tokens;
}

const light = tokensOfSelector(":root");
const dark = tokensOfSelector(':root[data-theme="dark"]');

/**
 * Paires (premier plan, arrière-plan) et seuil WCAG applicable.
 *
 * ⚠️ Les seuils sont majorés d'une marge (4,8 au lieu de 4,5 ; 3,3 au lieu
 * de 3). La conversion OKLCH→sRGB implémentée ici est une approximation : le
 * rendu réel du navigateur peut s'en écarter de quelques centièmes, et c'est
 * lui que mesure axe-core sur la page. Sans marge, un token calculé à
 * exactement 4,50 peut échouer à l'audit — ce qui s'est produit en M0.
 */
const REQUIRED_PAIRS: { fg: string; bg: string; min: number; label: string }[] = [
  { fg: "text", bg: "bg", min: 4.8, label: "texte principal sur fond" },
  { fg: "text", bg: "surface", min: 4.8, label: "texte principal sur surface" },
  { fg: "text", bg: "surface-raised", min: 4.8, label: "texte sur surface élevée" },
  { fg: "text-muted", bg: "bg", min: 4.8, label: "texte secondaire sur fond" },
  { fg: "text-muted", bg: "surface", min: 4.8, label: "texte secondaire sur surface" },
  { fg: "accent-fg", bg: "accent", min: 4.8, label: "texte sur bouton d'accent" },
  // Paire ajoutée après qu'axe-core l'a signalée sur l'élément actif de la
  // navigation : le test unitaire ne la couvrait pas, l'audit E2E l'a vue.
  { fg: "accent-strong", bg: "accent-subtle", min: 4.8, label: "accent sur fond teinté" },
  // Seuil 3:1 : élément d'interface non textuel (WCAG 1.4.11).
  { fg: "accent", bg: "bg", min: 3.3, label: "accent comme élément d'interface" },
  { fg: "border-strong", bg: "bg", min: 3.3, label: "bordure marquée" },
  { fg: "danger", bg: "bg", min: 3.3, label: "état d'erreur" },
  { fg: "success", bg: "bg", min: 3.3, label: "état de réussite" },
  { fg: "info", bg: "bg", min: 3.3, label: "état d'information" },
];

describe.each([
  ["thème clair", light],
  ["thème sombre", dark],
])("contraste des tokens — %s", (themeName, tokens) => {
  it.each(REQUIRED_PAIRS)(
    `$label : --$fg sur --$bg doit atteindre $min:1 (marge incluse)`,
    ({ fg, bg, min, label }) => {
      const fgValue = tokens[fg];
      const bgValue = tokens[bg];
      expect(fgValue, `token --${fg} absent du ${themeName}`).toBeDefined();
      expect(bgValue, `token --${bg} absent du ${themeName}`).toBeDefined();

      const ratio = contrastBetweenOklch(fgValue!, bgValue!);
      expect(
        ratio,
        `${label} (${themeName}) : ${ratio.toFixed(2)}:1, minimum ${min}:1`,
      ).toBeGreaterThanOrEqual(min);
    },
  );

  it("définit les mêmes tokens de couleur que l'autre thème", () => {
    // Un token présent dans un seul thème produit une couleur héritée
    // silencieusement — c'est-à-dire un bug invisible dans l'autre thème.
    const other = themeName === "thème clair" ? dark : light;
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(other).sort());
  });
});

describe("conversion OKLCH", () => {
  it("analyse les notations en pourcentage et en fraction", () => {
    expect(parseOklch("oklch(62% 0.148 42)")).toEqual({
      l: 0.62,
      c: 0.148,
      h: 42,
      alpha: 1,
    });
    expect(parseOklch("oklch(0.62 0.148 42)")?.l).toBeCloseTo(0.62, 5);
  });

  it("analyse l'opacité", () => {
    expect(parseOklch("oklch(20% 0.01 60 / 0.06)")?.alpha).toBeCloseTo(0.06, 5);
  });

  it("rejette une notation invalide", () => {
    expect(parseOklch("#ff0000")).toBeNull();
    expect(parseOklch("oklch(62%)")).toBeNull();
  });

  it("convertit le blanc et le noir de référence", () => {
    const white = oklchToRgb({ l: 1, c: 0, h: 0 });
    expect(white.r).toBeCloseTo(1, 2);
    expect(white.g).toBeCloseTo(1, 2);
    expect(white.b).toBeCloseTo(1, 2);

    const black = oklchToRgb({ l: 0, c: 0, h: 0 });
    expect(black.r).toBeCloseTo(0, 2);
  });

  it("retrouve le contraste maximal de 21:1 entre noir et blanc", () => {
    expect(contrastBetweenOklch("oklch(0% 0 0)", "oklch(100% 0 0)")).toBeCloseTo(21, 1);
  });

  it("produit un hexadécimal exploitable pour les fiches couleur", () => {
    expect(oklchToHex("oklch(100% 0 0)")).toBe("#ffffff");
    expect(oklchToHex("oklch(0% 0 0)")).toBe("#000000");
    expect(oklchToHex("oklch(62% 0.148 42)")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("échoue explicitement sur une notation invalide", () => {
    expect(() => oklchToHex("rouge")).toThrow(/invalide/i);
  });
});
