import { join } from "node:path";
import { cache } from "react";
import { scanContent } from "./registry";

/**
 * Registre de contenu, mémoïsé pour la durée d'une requête (`cache` de
 * React) : la page de niveau et la page de leçon peuvent chacune en avoir
 * besoin sans relire et revalider tout `content/` deux fois pour la même
 * requête.
 */
export const getContentRegistry = cache(() =>
  scanContent(join(process.cwd(), "content")),
);
