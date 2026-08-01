import { z } from "zod";

/**
 * Schémas des fiches bibliothèque (docs/05 M7, docs/04 §3.8).
 *
 * Même principe que `exercises/schema.ts` : les champs communs
 * (`libraryItemBase`) plus un discriminant `category`, dont dépendent les
 * attributs spécifiques (`attributes`) — dureté et hydrofugation pour un
 * matériau, lumens et température de couleur pour un luminaire. 18
 * catégories, donc 18 variantes ; c'est volontairement verbeux plutôt que
 * générique (`Record<string, unknown>`) : un attribut mal orthographié dans
 * le frontmatter d'une fiche « chaise » doit échouer à la synchronisation,
 * pas silencieusement disparaître.
 *
 * Les relations entre fiches (LIB-04 — « ce carrelage s'accorde avec ce
 * bois ») sont déclarées **dans la fiche source**, par slug, plutôt que dans
 * un fichier séparé : `content:sync` (M7 #50) les traduit en lignes
 * `LibraryRelation`. Cohérence bidirectionnelle exigée à la synchronisation
 * (`checkRelationSymmetry`, `library/relations.ts`) — pas ici, qui ne voit
 * qu'une fiche à la fois.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .min(1, "Le slug ne peut pas être vide.")
  .regex(
    SLUG_PATTERN,
    "Le slug doit être en minuscules, sans accents ni espaces (ex. « chene-huile »).",
  );

export const LIB_CATEGORIES = [
  "STYLE",
  "MATERIAL",
  "COLOR",
  "WOOD",
  "STONE",
  "FLOORING",
  "WALL_COVERING",
  "LIGHTING",
  "SOFA",
  "TABLE",
  "CHAIR",
  "STORAGE",
  "KITCHEN",
  "BATHROOM",
  "STAIRCASE",
  "TEXTILE",
  "PLANT",
  "ACCESSORY",
] as const;

export type LibCategory = (typeof LIB_CATEGORIES)[number];

export const BUDGET_TIERS = ["ECONOMY", "MID", "PREMIUM", "LUXURY"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

/** Miroir exact de l'enum Prisma `RoomType` (packages/db/prisma/schema.prisma, M4) — le paquet domaine ne dépend pas de Prisma. */
export const ROOM_TYPES = [
  "KITCHEN",
  "BATHROOM",
  "LIVING",
  "BEDROOM",
  "OFFICE",
  "HALL",
  "OUTDOOR",
  "OTHER",
] as const;
export type LibRoomType = (typeof ROOM_TYPES)[number];

/**
 * Types de relation (LIB-04). `PAIRS_WITH`, `AVOID_WITH` et `SAME_FAMILY`
 * sont symétriques par construction (si A va avec B, B va avec A) ;
 * `CHEAPER_ALT`/`PREMIUM_ALT` sont un couple inverse (A moins cher que B ⟺ B
 * plus haut de gamme que A) — voir `relations.ts` pour le contrôle
 * d'intégrité correspondant.
 */
export const RELATION_TYPES = [
  "PAIRS_WITH",
  "AVOID_WITH",
  "CHEAPER_ALT",
  "PREMIUM_ALT",
  "SAME_FAMILY",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

const dimensionsCmSchema = z.object({
  w: z.number().positive(),
  d: z.number().positive(),
  h: z.number().positive(),
});

const libraryItemBase = {
  slug: slugSchema,
  name: z.string().trim().min(1, "Le nom ne peut pas être vide."),
  summary: z.string().trim().min(1, "Le résumé ne peut pas être vide."),
  description: z.string().trim().min(1, "La description ne peut pas être vide."),
  pros: z.array(z.string().trim().min(1)).min(1, "Au moins un avantage."),
  cons: z.array(z.string().trim().min(1)).min(1, "Au moins un inconvénient."),
  budgetTier: z.enum(BUDGET_TIERS),
  budgetNote: z.string().trim().min(1).optional(),
  maintenance: z.string().trim().min(1, "L'entretien ne peut pas être vide."),
  mistakes: z.array(z.string().trim().min(1)).min(1, "Au moins une erreur à éviter."),
  bestFor: z.array(z.enum(ROOM_TYPES)).default([]),
  styles: z.array(slugSchema).default([]),
  noWorksNeeded: z.boolean().default(false),
  // Relations déclarées par slug, traduites en `LibraryRelation` à la
  // synchronisation (M7 #50) — jamais de champ `attributes` ici, elles sont
  // communes à toutes les catégories.
  pairsWith: z.array(slugSchema).default([]),
  avoidWith: z.array(slugSchema).default([]),
  cheaperAlt: z.array(slugSchema).default([]),
  premiumAlt: z.array(slugSchema).default([]),
  sameFamily: z.array(slugSchema).default([]),
};

const StyleAttributesSchema = z.object({
  period: z.string().trim().min(1),
  keyElements: z.array(z.string().trim().min(1)).min(1),
  typicalColors: z.array(z.string().trim().min(1)).min(1),
});

const MaterialAttributesSchema = z.object({
  hardness: z.number().int().min(1).max(5),
  waterResistance: z.enum(["none", "low", "medium", "high"]),
  thermalFeel: z.enum(["cold", "neutral", "warm"]),
  thicknessMm: z.number().positive().optional(),
});

const ColorAttributesSchema = z.object({
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale attendue (#rrggbb)."),
  oklch: z.object({
    l: z.number().min(0).max(1),
    c: z.number().min(0),
    h: z.number().min(0).max(360),
  }),
  undertone: z.enum(["warm", "cool", "neutral"]),
  lrv: z.number().min(0).max(100),
});

const WoodAttributesSchema = z.object({
  species: z.string().trim().min(1),
  jankaHardness: z.number().positive(),
  grain: z.enum(["fine", "medium", "coarse"]),
  priceIndex: z.number().int().min(1).max(5),
});

const StoneAttributesSchema = z.object({
  porosity: z.enum(["low", "medium", "high"]),
  finish: z.enum(["poli", "adouci", "brut", "flamme"]),
  scratchResistance: z.number().int().min(1).max(5),
});

const FlooringAttributesSchema = z.object({
  installType: z.enum(["colle", "flottant", "cloue"]),
  thicknessMm: z.number().positive(),
  soundInsulation: z.enum(["faible", "moyenne", "bonne"]),
  underfloorHeatingCompatible: z.boolean(),
});

const WallCoveringAttributesSchema = z.object({
  coverageM2PerUnit: z.number().positive(),
  washable: z.boolean(),
  pattern: z.enum(["uni", "texture", "motif"]),
});

const LightingAttributesSchema = z.object({
  lumens: z.number().positive(),
  kelvin: z.number().int().min(1000).max(10000),
  cri: z.number().int().min(0).max(100),
  beamAngleDeg: z.number().int().min(1).max(360),
  dimmable: z.boolean(),
});

const SofaAttributesSchema = z.object({
  seats: z.number().int().positive(),
  dimensions: dimensionsCmSchema,
  seatHeightCm: z.number().positive(),
  upholstery: z.string().trim().min(1),
});

const TableAttributesSchema = z.object({
  dimensions: dimensionsCmSchema,
  seats: z.number().int().positive().optional(),
  shape: z.enum(["rectangulaire", "ronde", "ovale", "carree"]),
});

const ChairAttributesSchema = z.object({
  dimensions: dimensionsCmSchema,
  seatHeightCm: z.number().positive(),
  stackable: z.boolean(),
});

const StorageAttributesSchema = z.object({
  dimensions: dimensionsCmSchema,
  capacityLiters: z.number().positive().optional(),
  doors: z.number().int().nonnegative().optional(),
});

const KitchenAttributesSchema = z.object({
  configuration: z.enum(["lineaire", "en-l", "en-u", "ilot"]),
  worktopMaterial: z.string().trim().min(1),
});

const BathroomAttributesSchema = z.object({
  fixtureType: z.enum(["vasque", "douche", "baignoire", "wc", "robinetterie"]),
  waterConsumptionLitersPerMin: z.number().positive().optional(),
});

const StaircaseAttributesSchema = z.object({
  type: z.enum(["droit", "quart-tournant", "helicoidal", "escamotable"]),
  material: z.string().trim().min(1),
  minWidthCm: z.number().positive(),
});

const TextileAttributesSchema = z.object({
  fiber: z.string().trim().min(1),
  weightGsm: z.number().positive().optional(),
  washable: z.boolean(),
  lightfastness: z.number().int().min(1).max(5).optional(),
});

const PlantAttributesSchema = z.object({
  lightNeed: z.enum(["faible", "moyenne", "forte"]),
  wateringFrequencyDays: z.number().int().positive(),
  petSafe: z.boolean(),
  matureHeightCm: z.number().positive().optional(),
});

const AccessoryAttributesSchema = z.object({
  material: z.string().trim().min(1),
  dimensions: dimensionsCmSchema.partial().optional(),
});

export const LibraryItemFrontmatterSchema = z.discriminatedUnion("category", [
  z.object({
    ...libraryItemBase,
    category: z.literal("STYLE"),
    attributes: StyleAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("MATERIAL"),
    attributes: MaterialAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("COLOR"),
    attributes: ColorAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("WOOD"),
    attributes: WoodAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("STONE"),
    attributes: StoneAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("FLOORING"),
    attributes: FlooringAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("WALL_COVERING"),
    attributes: WallCoveringAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("LIGHTING"),
    attributes: LightingAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("SOFA"),
    attributes: SofaAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("TABLE"),
    attributes: TableAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("CHAIR"),
    attributes: ChairAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("STORAGE"),
    attributes: StorageAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("KITCHEN"),
    attributes: KitchenAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("BATHROOM"),
    attributes: BathroomAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("STAIRCASE"),
    attributes: StaircaseAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("TEXTILE"),
    attributes: TextileAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("PLANT"),
    attributes: PlantAttributesSchema,
  }),
  z.object({
    ...libraryItemBase,
    category: z.literal("ACCESSORY"),
    attributes: AccessoryAttributesSchema,
  }),
]);

export type LibraryItemFrontmatter = z.infer<typeof LibraryItemFrontmatterSchema>;
