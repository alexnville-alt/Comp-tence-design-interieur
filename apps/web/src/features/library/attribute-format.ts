/**
 * Affichage générique des attributs spécifiques à la catégorie (docs/04
 * §3.8) : 18 catégories, 18 formes différentes — un rendu par catégorie
 * serait dix-huit fois plus de code pour le même résultat (une liste
 * clé/valeur). `LibraryItemFrontmatterSchema` (`@atelier/domain`) garantit
 * déjà la forme à l'écriture ; ici, on se contente de l'afficher lisiblement.
 */

function formatKey(key: string): string {
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

function formatPrimitive(value: unknown): string {
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

export function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map(formatPrimitive).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatKey(k)} : ${formatPrimitive(v)}`)
      .join(" · ");
  }
  return formatPrimitive(value);
}

export function formatAttributeEntries(
  attributes: Record<string, unknown>,
): { key: string; label: string; value: string }[] {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    label: formatKey(key),
    value: formatAttributeValue(value),
  }));
}
