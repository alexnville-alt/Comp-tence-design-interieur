import { createHash } from "node:crypto";
import sharp from "sharp";

/**
 * Traitement d'image serveur (ADR-0008, docs/02 §5.6, docs/05 M6).
 *
 * Toujours appelé sur les octets **téléchargés depuis S3**, jamais sur ce que
 * le client prétend avoir envoyé — ni le type déclaré à la demande d'URL
 * présignée, ni l'extension du nom de fichier, ne sont dignes de confiance
 * (voir `apps/web/src/features/photos/upload-actions.ts`).
 */

/** docs/05 M6, critère d'acceptation : une photo de 12 Mo doit être traitée sans erreur. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** docs/02 §5.6 : au-delà, une image pleine résolution peut coûter jusqu'à ~4 800 tokens. */
export const MAX_DIMENSION_PX = 1568;

const ALLOWED_SHARP_FORMATS = ["jpeg", "png", "webp"] as const;

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImageError";
  }
}

export interface ProcessedImage {
  bytes: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  /** Déduplication + cache d'analyse (ADR-0008) — calculé sur les octets déjà traités. */
  sha256: string;
}

/**
 * Vérifie que le fichier est réellement une image (magic bytes lus par
 * `sharp`, jamais le `Content-Type` déclaré), retire l'EXIF — donc les
 * coordonnées GPS — et redimensionne à `MAX_DIMENSION_PX`.
 *
 * **Pourquoi l'EXIF disparaît sans code dédié pour ça** : `sharp` ne recopie
 * les métadonnées EXIF/ICC en sortie que si `.withMetadata()` est appelé — un
 * ré-encodage nu les supprime déjà. La garantie « GPS effacé » (ADR-0008) est
 * donc une propriété du pipeline (ré-encodage systématique en JPEG, jamais de
 * copie d'octets bruts), vérifiée par un test dédié plutôt que supposée.
 */
export async function processUploadedImage(rawBytes: Buffer): Promise<ProcessedImage> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(rawBytes).metadata());
  } catch {
    throw new InvalidImageError("Fichier illisible : ce n'est pas une image valide.");
  }

  if (!format || !(ALLOWED_SHARP_FORMATS as readonly string[]).includes(format)) {
    throw new InvalidImageError(
      `Format d'image non pris en charge : ${format ?? "inconnu"} (attendu : JPEG, PNG ou WebP).`,
    );
  }

  const bytes = await sharp(rawBytes)
    // Applique la rotation indiquée par l'EXIF avant de le supprimer, sinon
    // l'image ressortirait pivotée pour l'apprenant comme pour l'IA.
    .rotate()
    .resize({
      width: MAX_DIMENSION_PX,
      height: MAX_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    // Une seule sortie à traiter en aval (analyse IA, aperçus, stockage) —
    // quel que soit le format d'entrée.
    .jpeg({ quality: 85 })
    .toBuffer();

  const outputMetadata = await sharp(bytes).metadata();

  return {
    bytes,
    mimeType: "image/jpeg",
    width: outputMetadata.width ?? 0,
    height: outputMetadata.height ?? 0,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
