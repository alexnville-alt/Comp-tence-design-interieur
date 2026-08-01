import { randomFillSync } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { InvalidImageError, MAX_DIMENSION_PX, processUploadedImage } from "./image";

async function solidImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp" = "jpeg",
): Promise<Buffer> {
  const image = sharp({
    create: { width, height, channels: 3, background: { r: 180, g: 120, b: 60 } },
  });
  return format === "jpeg" ? image.jpeg().toBuffer() : image[format]().toBuffer();
}

describe("processUploadedImage", () => {
  it("traite une image JPEG valide et calcule son SHA-256", async () => {
    const input = await solidImage(400, 300);
    const result = await processUploadedImage(input);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("accepte PNG et WebP en entrée, ressort toujours en JPEG", async () => {
    for (const format of ["png", "webp"] as const) {
      const input = await solidImage(200, 200, format);
      const result = await processUploadedImage(input);
      expect(result.mimeType).toBe("image/jpeg");
      const outputFormat = (await sharp(result.bytes).metadata()).format;
      expect(outputFormat).toBe("jpeg");
    }
  });

  it("redimensionne une image surdimensionnée à MAX_DIMENSION_PX en conservant les proportions", async () => {
    const input = await solidImage(3000, 1500);
    const result = await processUploadedImage(input);
    expect(result.width).toBeLessThanOrEqual(MAX_DIMENSION_PX);
    expect(result.height).toBeLessThanOrEqual(MAX_DIMENSION_PX);
    // Ratio 2:1 conservé (à l'arrondi de redimensionnement près).
    expect(result.width / result.height).toBeCloseTo(2, 1);
  });

  it("n'agrandit jamais une petite image (withoutEnlargement)", async () => {
    const input = await solidImage(100, 80);
    const result = await processUploadedImage(input);
    expect(result.width).toBeLessThanOrEqual(100);
    expect(result.height).toBeLessThanOrEqual(80);
  });

  it("traite une image de 12 Mo sans erreur (docs/05 M6, critère d'acceptation)", async () => {
    // Du vrai bruit aléatoire (pas un aplat de couleur) résiste à la
    // compression JPEG — c'est ce qui permet de dépasser 12 Mo sans
    // générer une image de plusieurs dizaines de milliers de pixels de
    // large, qui rendrait le test lent pour rien.
    const width = 3000;
    const height = 2400;
    const raw = Buffer.alloc(width * height * 3);
    randomFillSync(raw);
    const input = await sharp(raw, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
      .toBuffer();
    expect(input.length).toBeGreaterThan(12 * 1024 * 1024);

    const result = await processUploadedImage(input);
    expect(result.width).toBeLessThanOrEqual(MAX_DIMENSION_PX);
  }, 15_000);

  it("rejette des octets qui ne sont pas une image", async () => {
    await expect(
      processUploadedImage(Buffer.from("ceci n'est pas une image")),
    ).rejects.toThrow(InvalidImageError);
  });

  it("efface les coordonnées GPS (EXIF) avant tout stockage — test dédié (ADR-0008)", async () => {
    const withGps = await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .jpeg()
      .withExif({
        IFD0: { Copyright: "Photo personnelle" },
        // IFD3 est l'emplacement conventionnel du GPS IFD en EXIF.
        IFD3: {
          GPSLatitude: "48/1 51/1 0/1",
          GPSLatitudeRef: "N",
          GPSLongitude: "2/1 21/1 0/1",
          GPSLongitudeRef: "E",
        },
      })
      .toBuffer();

    // Vérifie que l'image de test embarque bien des coordonnées GPS avant
    // traitement — sinon le test ne prouverait rien.
    const inputMetadata = await sharp(withGps).metadata();
    expect(inputMetadata.exif).toBeDefined();

    const result = await processUploadedImage(withGps);
    const outputMetadata = await sharp(result.bytes).metadata();
    expect(outputMetadata.exif).toBeUndefined();
  });
});
