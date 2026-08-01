import type { BudgetTier, LibCategory, RelationType } from "@atelier/db";

export const CATEGORY_LABELS: Record<LibCategory, string> = {
  STYLE: "Style",
  MATERIAL: "Matériau",
  COLOR: "Couleur",
  WOOD: "Bois",
  STONE: "Pierre",
  FLOORING: "Sol",
  WALL_COVERING: "Revêtement mural",
  LIGHTING: "Éclairage",
  SOFA: "Canapé",
  TABLE: "Table",
  CHAIR: "Chaise / fauteuil",
  STORAGE: "Rangement",
  KITCHEN: "Cuisine",
  BATHROOM: "Salle de bain",
  STAIRCASE: "Escalier",
  TEXTILE: "Textile",
  PLANT: "Plante",
  ACCESSORY: "Accessoire",
};

export const BUDGET_TIER_LABELS: Record<BudgetTier, string> = {
  ECONOMY: "Économique",
  MID: "Milieu de gamme",
  PREMIUM: "Premium",
  LUXURY: "Luxe",
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  PAIRS_WITH: "S'associe bien avec",
  AVOID_WITH: "À éviter avec",
  CHEAPER_ALT: "Alternative moins chère",
  PREMIUM_ALT: "Alternative plus haut de gamme",
  SAME_FAMILY: "Même famille",
};
