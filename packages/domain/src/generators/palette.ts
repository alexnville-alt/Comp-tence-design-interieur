import { z } from "zod";

/**
 * Générateur de palettes (docs/05 M8).
 *
 * L'IA propose des couleurs et les justifie ; elle n'annonce **jamais** de
 * ratio de contraste elle-même — un modèle de langage n'est pas fiable pour
 * de l'arithmétique de perception colorimétrique, même simple. Le serveur
 * recalcule chaque ratio pertinent avec `computeContrastChecks` (fonction
 * pure ci-dessous) à partir des couleurs proposées : le critère d'acceptation
 * « une palette générée respecte les contrastes annoncés » est donc garanti
 * par construction, pas simplement vérifié après coup — le nombre annoncé
 * est le nombre calculé, jamais une reformulation de ce que l'IA a dit.
 *
 * Le calcul de contraste (luminance relative WCAG, formule de conversion
 * sRGB → linéaire) est **dupliqué** de `packages/ui/src/oklch.ts`
 * volontairement : `packages/domain` ne peut importer aucun paquet du
 * monorepo (ADR-0009, table de dépendances), et `packages/ui` non plus. Même
 * principe que `slugSchema`, déjà dupliqué entre `exercises/schema.ts` et
 * `curriculum/lesson-content.ts` — chaque paquet reste autonome plutôt que de
 * créer une dépendance croisée pour quelques lignes de calcul pur.
 */

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

const hexSchema = z
  .string()
  .regex(HEX_PATTERN, "Couleur hexadécimale attendue (#rrggbb).");

export const PALETTE_ROLES = ["dominante", "secondaire", "accent", "neutre"] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];

export const PaletteColorSchema = z.object({
  hex: hexSchema,
  role: z.enum(PALETTE_ROLES),
  /** Pourquoi cette couleur, dans ce rôle, pour cette pièce/style — jamais un intitulé sans justification (AI-02). */
  justification: z.string().trim().min(1),
});
export type PaletteColor = z.infer<typeof PaletteColorSchema>;

/** Sortie IA (`AiProvider.complete`) — pas de champ de contraste ici, calculé après coup. */
export const PaletteGenerationSchema = z.object({
  colors: z
    .array(PaletteColorSchema)
    .min(3, "Une palette utilisable a au moins trois couleurs.")
    .max(6, "Au-delà de six couleurs, ce n'est plus une palette lisible."),
  synthese: z.string().trim().min(1),
});
export type PaletteGeneration = z.infer<typeof PaletteGenerationSchema>;

export interface ContrastCheck {
  colorHexA: string;
  colorHexB: string;
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
}

// ── Calcul WCAG (dupliqué intentionnellement, voir en-tête) ────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Ratio WCAG entre deux couleurs, de 1 (identiques) à 21 (noir/blanc). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Vérifie chaque couleur contre la « dominante » de la palette — c'est la
 * paire qui compte en pratique (un mur dominant et ses accents doivent
 * rester lisibles ensemble), pas toutes les combinaisons C(n,2) qui
 * n'auraient pas de sens décoratif.
 */
export function computeContrastChecks(colors: PaletteColor[]): ContrastCheck[] {
  const dominante = colors.find((c) => c.role === "dominante");
  if (!dominante) return [];

  return colors
    .filter((c) => c.hex !== dominante.hex)
    .map((color) => {
      const ratio = contrastRatio(dominante.hex, color.hex);
      return {
        colorHexA: dominante.hex,
        colorHexB: color.hex,
        ratio: Math.round(ratio * 100) / 100,
        meetsAA: ratio >= 4.5,
        meetsAAA: ratio >= 7,
      };
    });
}
