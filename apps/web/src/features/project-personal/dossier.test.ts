import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildProjectDossierPdf, type DossierData } from "./dossier";

/**
 * `sharp().toBuffer()` renvoie un `Buffer` du realm Node ; l'environnement
 * de test `jsdom` a son propre realm, où `Buffer instanceof Uint8Array` est
 * `false` malgré un contenu identique (pdf-lib le rejetterait). `new
 * Uint8Array(buffer)` copie les octets dans le realm du test, sans effet en
 * production où le code tourne dans un seul realm Node (route handler).
 */
async function solidJpeg(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 150, b: 100 } },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}

/**
 * `Buffer.from(...)` sur de petits tableaux (`getObjectBytes`, S3) alloue
 * depuis le pool interne de Node : le `Uint8Array` renvoyé a un
 * `byteOffset` non nul dans un `.buffer` partagé, bien plus grand que lui.
 * `JpegEmbedder.for` (pdf-lib) lit `imageData.buffer` sans tenir compte de
 * cet offset — sans la normalisation dans `dossier.ts` (`ownedBytes`), cette
 * vue serait lue depuis le début du pool, jamais depuis l'image.
 */
function withNonZeroByteOffset(bytes: Uint8Array): Uint8Array {
  const padded = new Uint8Array(bytes.length + 64);
  padded.set(bytes, 64);
  return padded.subarray(64);
}

function baseData(overrides: Partial<DossierData> = {}): DossierData {
  return {
    projectName: "Appartement Bastille",
    address: "12 rue des Lilas, Lyon",
    budgetCents: 850000,
    rooms: [],
    moodboards: [],
    journalEntries: [],
    ...overrides,
  };
}

describe("buildProjectDossierPdf", () => {
  it("génère un PDF valide avec au moins une page de couverture", async () => {
    const bytes = await buildProjectDossierPdf(baseData());
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("ajoute une page par pièce, avec plan et photos intégrés", async () => {
    const plan = await solidJpeg(800, 600);
    const photo = await solidJpeg(600, 400);
    const bytes = await buildProjectDossierPdf(
      baseData({
        rooms: [
          {
            name: "Séjour",
            type: "LIVING",
            status: "IN_PROGRESS",
            planJpegBytes: plan,
            photos: [{ caption: "Mur nord", jpegBytes: photo }],
            furniture: [
              {
                key: "canape",
                label: "Canapé",
                footprint: { w: 200, d: 90, h: 80 },
                quantity: 1,
                linkedToLibrary: false,
              },
            ],
          },
        ],
      }),
    );
    const doc = await PDFDocument.load(bytes);
    // Couverture + 1 page de pièce.
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("ajoute une page par moodboard, en reproduisant les positions du plateau", async () => {
    const swatch = await solidJpeg(100, 100);
    const bytes = await buildProjectDossierPdf(
      baseData({
        moodboards: [
          {
            title: "Ambiance chaleureuse",
            items: [
              {
                label: "Teinte dominante",
                colorHex: "#a35b3f",
                jpegBytes: null,
                transform: { x: 0, y: 0, w: 200, h: 200, z: 0, rotation: 0 },
              },
              {
                label: "Fauteuil vintage",
                colorHex: null,
                jpegBytes: swatch,
                transform: { x: 300, y: 100, w: 220, h: 220, z: 1, rotation: 0 },
              },
            ],
          },
        ],
      }),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("ajoute une page journal quand le journal n'est pas vide", async () => {
    const withJournal = await buildProjectDossierPdf(
      baseData({
        journalEntries: [
          {
            title: "Budget cuisine",
            kind: "BUDGET",
            body: "Enveloppe fixée à 8000 €.",
            createdAt: new Date("2026-01-01"),
          },
        ],
      }),
    );
    const withoutJournal = await buildProjectDossierPdf(baseData());

    const docWith = await PDFDocument.load(withJournal);
    const docWithout = await PDFDocument.load(withoutJournal);
    expect(docWith.getPageCount()).toBeGreaterThan(docWithout.getPageCount());
  });

  it("embarque une image dont les octets ont un byteOffset non nul (pool de Buffer Node, régression)", async () => {
    const plan = withNonZeroByteOffset(await solidJpeg(100, 80));
    const bytes = await buildProjectDossierPdf(
      baseData({
        rooms: [
          {
            name: "Chambre",
            type: "BEDROOM",
            status: "TO_DESIGN",
            planJpegBytes: plan,
            photos: [],
            furniture: [],
          },
        ],
      }),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("n'échoue pas quand le projet est vide (aucune pièce, moodboard ou entrée de journal)", async () => {
    const bytes = await buildProjectDossierPdf(
      baseData({ address: null, budgetCents: null }),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
