import { cookies } from "next/headers";

/**
 * Gestion du thème sans clignotement.
 *
 * Le problème classique : un thème lu depuis `localStorage` dans un `useEffect`
 * n'est appliqué qu'après l'hydratation, donc l'utilisateur voit un éclair
 * blanc à chaque chargement en mode sombre. La parade habituelle est un script
 * bloquant injecté dans le `<head>` — mais elle impose un `script-src`
 * permissif dans la politique de sécurité de contenu.
 *
 * Choix retenu : stocker la préférence dans un **cookie**, le lire côté serveur
 * et poser directement `data-theme` sur `<html>` lors du rendu. Aucun script,
 * aucun clignotement, et une CSP stricte reste possible.
 *
 * Absence de cookie = suivre le système, ce qui est géré en CSS par
 * `@media (prefers-color-scheme: dark)`.
 */

export const THEME_COOKIE = "atelier-theme";
export const MOTION_COOKIE = "atelier-reduced-motion";

export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

export async function readThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "LIGHT" || value === "DARK" ? value : "SYSTEM";
}

/**
 * Préférence applicative de réduction des animations (AUTH-03).
 * Elle s'ajoute à `prefers-reduced-motion` sans le remplacer : un utilisateur
 * dont le système la demande l'obtient de toute façon, via tokens.css.
 */
export async function readReducedMotion(): Promise<boolean> {
  const store = await cookies();
  return store.get(MOTION_COOKIE)?.value === "true";
}

/**
 * Attribut `data-theme` à poser sur `<html>`.
 * `undefined` pour « système » : c'est l'absence d'attribut qui laisse la
 * requête média décider.
 */
export function themeAttribute(
  preference: ThemePreference,
): "light" | "dark" | undefined {
  if (preference === "LIGHT") return "light";
  if (preference === "DARK") return "dark";
  return undefined;
}
