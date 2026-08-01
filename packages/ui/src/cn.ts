import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind en résolvant les conflits.
 *
 * `clsx` gère les classes conditionnelles, `twMerge` élimine les conflits :
 * `cn("p-2", "p-4")` donne `"p-4"` et non `"p-2 p-4"`, ce qui rend prévisible
 * la surcharge d'un composant depuis l'extérieur via une prop `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
