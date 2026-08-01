/**
 * Conversion OKLCH → sRGB et calcul de contraste WCAG.
 *
 * Cet outillage existe pour une raison précise : les tokens de couleur sont
 * définis en OKLCH dans `tokens.css`, et il est impossible de vérifier « à
 * l'œil » qu'un token respecte le ratio 4,5:1 dans les deux thèmes. Sans
 * mesure, une régression de contraste passe inaperçue jusqu'à l'audit
 * d'accessibilité — c'est-à-dire trop tard.
 *
 * Il sera également réutilisé côté produit : les fiches couleur de la
 * bibliothèque affichent leur ratio de contraste (docs/03 §2.1), et le
 * générateur de palettes (M8) doit vérifier ses propres propositions.
 *
 * Références : formules OKLab de Björn Ottosson, luminance relative WCAG 2.2.
 */

export interface Oklch {
  /** Luminosité perceptuelle, 0 → 1. */
  l: number;
  /** Chroma, 0 → ~0,4. */
  c: number;
  /** Teinte en degrés, 0 → 360. */
  h: number;
  /** Opacité, 0 → 1. */
  alpha: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Analyse une notation CSS `oklch(62% 0.148 42)` ou `oklch(0.62 0.148 42 / 0.5)`.
 * @returns `null` si la chaîne n'est pas une notation OKLCH exploitable.
 */
export function parseOklch(value: string): Oklch | null {
  const match = /oklch\(\s*([^)]+)\)/i.exec(value.trim());
  if (!match?.[1]) return null;

  const [colorPart, alphaPart] = match[1].split("/");
  const parts = colorPart!.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const l = parseComponent(parts[0]!, true);
  const c = parseComponent(parts[1]!, false);
  const h = parseComponent(parts[2]!, false);
  const alpha = alphaPart === undefined ? 1 : parseComponent(alphaPart.trim(), true);

  if ([l, c, h, alpha].some(Number.isNaN)) return null;
  return { l, c, h, alpha };
}

/** Un pourcentage est ramené à 0–1 pour la luminosité et l'alpha. */
function parseComponent(raw: string, percentIsFraction: boolean): number {
  if (raw.endsWith("%")) {
    const n = Number.parseFloat(raw.slice(0, -1));
    return percentIsFraction ? n / 100 : n;
  }
  return Number.parseFloat(raw);
}

/** OKLCH → sRGB, chaque canal dans 0–1, écrêté au gamut affichable. */
export function oklchToRgb({ l, c, h }: Pick<Oklch, "l" | "c" | "h">): Rgb {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab → LMS (racines cubiques)
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;

  const lms = { l: lRoot ** 3, m: mRoot ** 3, s: sRoot ** 3 };

  // LMS → sRGB linéaire
  const rLin = 4.0767416621 * lms.l - 3.3077115913 * lms.m + 0.2309699292 * lms.s;
  const gLin = -1.2684380046 * lms.l + 2.6097574011 * lms.m - 0.3413193965 * lms.s;
  const bLin = -0.0041960863 * lms.l - 0.7034186147 * lms.m + 1.707614701 * lms.s;

  return {
    r: clamp01(gammaEncode(rLin)),
    g: clamp01(gammaEncode(gLin)),
    b: clamp01(gammaEncode(bLin)),
  };
}

function gammaEncode(channel: number): number {
  const sign = channel < 0 ? -1 : 1;
  const abs = Math.abs(channel);
  return abs <= 0.0031308 ? channel * 12.92 : sign * (1.055 * abs ** (1 / 2.4) - 0.055);
}

function gammaDecode(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Luminance relative WCAG 2.2, à partir d'un sRGB écrêté. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * gammaDecode(r) + 0.7152 * gammaDecode(g) + 0.0722 * gammaDecode(b);
}

/**
 * Ratio de contraste WCAG entre deux couleurs, de 1:1 à 21:1.
 * Seuils : 4,5 pour du texte courant, 3 pour du texte large ou un élément
 * d'interface, 7 pour le niveau AAA.
 */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Raccourci : contraste entre deux notations CSS OKLCH. */
export function contrastBetweenOklch(a: string, b: string): number {
  const colorA = parseOklch(a);
  const colorB = parseOklch(b);
  if (!colorA || !colorB) {
    throw new Error(`Notation OKLCH invalide : ${!colorA ? a : b}`);
  }
  return contrastRatio(oklchToRgb(colorA), oklchToRgb(colorB));
}

/** Conversion en hexadécimal, pour l'affichage dans les fiches couleur. */
export function oklchToHex(value: string): string {
  const parsed = parseOklch(value);
  if (!parsed) throw new Error(`Notation OKLCH invalide : ${value}`);
  const { r, g, b } = oklchToRgb(parsed);
  const toHex = (channel: number) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
