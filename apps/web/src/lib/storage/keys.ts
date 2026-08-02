import { randomUUID } from "node:crypto";

/**
 * Clé S3 d'une photo à téléverser — jamais dérivée du nom de fichier fourni
 * par le client (évite la traversée de chemin et les collisions).
 *
 * Le flux ADR-0008 dépose les octets bruts sous cette clé, puis le serveur
 * **réécrit à la même clé** une fois l'image validée et traitée (magic
 * bytes, EXIF, redimensionnement) : une seule clé par photo, jamais deux
 * objets à faire correspondre.
 */
export function buildPhotoStorageKey(userId: string): string {
  return `photos/${userId}/${randomUUID()}`;
}

/** Même principe que `buildPhotoStorageKey` — plans importés et photos de pièce du projet personnel (docs/05 M10). */
export function buildProjectAssetStorageKey(userId: string): string {
  return `project-assets/${userId}/${randomUUID()}`;
}
