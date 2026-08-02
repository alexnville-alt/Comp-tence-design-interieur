import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DimensionedFurnitureEntry, MoodboardTransform } from "@atelier/domain";
import { ROOM_TYPE_LABELS } from "@/features/studio/room-type-labels";
import { ROOM_STATUS_LABELS } from "@/features/studio/room-status-labels";
import { JOURNAL_KIND_LABELS } from "@atelier/domain";

/**
 * Export dossier PDF (docs/05 M10, PROJ-08) : plans, moodboards, listes de
 * mobilier et budget. Composition pure à partir d'octets déjà résolus
 * (images JPEG déjà téléchargées depuis S3 par l'appelant) — aucun accès
 * DB/réseau ici, ce qui permet de la tester sans Postgres ni MinIO, comme le
 * reste des fonctions pures de l'application (même principe qu'ADR-0009).
 *
 * Toutes les images stockées dans `Asset` sont normalisées en JPEG par
 * `processUploadedImage` (M6) quelle que soit leur origine — `embedJpg` est
 * donc toujours le bon choix, jamais besoin de détecter le format.
 */

export interface DossierRoomPhoto {
  caption: string | null;
  jpegBytes: Uint8Array;
}

export interface DossierRoom {
  name: string;
  type: string;
  status: string;
  planJpegBytes: Uint8Array | null;
  photos: DossierRoomPhoto[];
  furniture: DimensionedFurnitureEntry[];
}

export interface DossierMoodboardItem {
  label: string | null;
  colorHex: string | null;
  jpegBytes: Uint8Array | null;
  transform: MoodboardTransform;
}

export interface DossierMoodboard {
  title: string;
  items: DossierMoodboardItem[];
}

export interface DossierJournalEntry {
  title: string;
  kind: string;
  body: string;
  createdAt: Date;
}

export interface DossierData {
  projectName: string;
  address: string | null;
  budgetCents: number | null;
  rooms: DossierRoom[];
  moodboards: DossierMoodboard[];
  journalEntries: DossierJournalEntry[];
}

const PAGE_WIDTH = 595.28; // A4, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

function formatBudget(budgetCents: number | null): string {
  if (budgetCents == null) return "Non renseigné.";
  const euros = budgetCents / 100;
  return `Ordre de grandeur : ${euros.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`;
}

/**
 * `pdf-lib` (`JpegEmbedder.for`) lit `imageData.buffer` directement, sans
 * tenir compte de `byteOffset` — correct pour un `Uint8Array` autonome, mais
 * faux pour un `Buffer` Node alloué depuis le pool interne (`Buffer.from`
 * sur un petit tableau, comme le renvoie `getObjectBytes`) : son `.buffer`
 * est le pool partagé, pas les octets de l'image, et la marque SOI attendue
 * en tête n'y est pas. Une copie dans un `Uint8Array` neuf (offset 0)
 * élimine le problème avant de passer les octets à `embedJpg`.
 */
function ownedBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

/** Découpe un texte en lignes qui tiennent dans `maxWidth`, sans jamais couper un mot. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface Cursor {
  page: PDFPage;
  y: number;
}

function newPage(doc: PDFDocument): Cursor {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { page, y: PAGE_HEIGHT - MARGIN };
}

function drawHeading(cursor: Cursor, text: string, font: PDFFont, size = 18): void {
  cursor.page.drawText(text, {
    x: MARGIN,
    y: cursor.y,
    size,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursor.y -= size + 10;
}

function drawParagraph(
  cursor: Cursor,
  text: string,
  font: PDFFont,
  size = 11,
  color = rgb(0.2, 0.2, 0.2),
): void {
  for (const line of wrapText(text, font, size, CONTENT_WIDTH)) {
    cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size, font, color });
    cursor.y -= size + 5;
  }
}

function ensureSpace(doc: PDFDocument, cursor: Cursor, needed: number): Cursor {
  if (cursor.y - needed < MARGIN) return newPage(doc);
  return cursor;
}

function drawCoverSection(
  cursor: Cursor,
  font: PDFFont,
  bold: PDFFont,
  data: DossierData,
): void {
  drawHeading(cursor, data.projectName, bold, 24);
  cursor.y -= 6;
  drawParagraph(cursor, `Adresse : ${data.address ?? "Non renseignée."}`, font);
  drawParagraph(cursor, `Budget : ${formatBudget(data.budgetCents)}`, font);
  cursor.y -= 16;
}

function drawFurnitureTable(
  doc: PDFDocument,
  cursor: Cursor,
  font: PDFFont,
  bold: PDFFont,
  furniture: DimensionedFurnitureEntry[],
): Cursor {
  let c = cursor;
  c = ensureSpace(doc, c, 20);
  c.page.drawText("Mobilier", { x: MARGIN, y: c.y, size: 13, font: bold });
  c.y -= 18;

  if (furniture.length === 0) {
    c = ensureSpace(doc, c, 16);
    drawParagraph(c, "Aucun mobilier posé pour l'instant.", font);
    return c;
  }

  for (const entry of furniture) {
    c = ensureSpace(doc, c, 16);
    const link = entry.linkedToLibrary ? " — relié à la bibliothèque" : "";
    const line = `${entry.label} × ${entry.quantity} — ${entry.footprint.w}×${entry.footprint.d}×${entry.footprint.h} cm${link}`;
    drawParagraph(c, line, font);
  }
  return c;
}

async function embedRoomImage(
  doc: PDFDocument,
  cursor: Cursor,
  font: PDFFont,
  jpegBytes: Uint8Array,
  caption: string,
  maxWidth: number,
  maxHeight: number,
): Promise<Cursor> {
  let c = ensureSpace(doc, cursor, maxHeight + 20);
  const image = await doc.embedJpg(ownedBytes(jpegBytes));
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = image.width * scale;
  const height = image.height * scale;
  c.page.drawImage(image, { x: MARGIN, y: c.y - height, width, height });
  c.y -= height + 4;
  if (caption) {
    c = ensureSpace(doc, c, 16);
    drawParagraph(c, caption, font, 9, rgb(0.4, 0.4, 0.4));
  }
  c.y -= 8;
  return c;
}

async function drawRoomSection(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  room: DossierRoom,
): Promise<Cursor> {
  let c = newPage(doc);
  drawHeading(c, room.name, bold, 16);
  const typeLabel =
    ROOM_TYPE_LABELS[room.type as keyof typeof ROOM_TYPE_LABELS] ?? room.type;
  const statusLabel =
    ROOM_STATUS_LABELS[room.status as keyof typeof ROOM_STATUS_LABELS] ?? room.status;
  drawParagraph(c, `${typeLabel} — État : ${statusLabel}`, font);
  c.y -= 6;

  if (room.planJpegBytes) {
    c.page.drawText("Plan de référence", { x: MARGIN, y: c.y, size: 13, font: bold });
    c.y -= 18;
    c = await embedRoomImage(doc, c, font, room.planJpegBytes, "", CONTENT_WIDTH, 260);
  }

  if (room.photos.length > 0) {
    c = ensureSpace(doc, c, 20);
    c.page.drawText("Photos", { x: MARGIN, y: c.y, size: 13, font: bold });
    c.y -= 18;
    for (const photo of room.photos) {
      c = await embedRoomImage(
        doc,
        c,
        font,
        photo.jpegBytes,
        photo.caption ?? "",
        CONTENT_WIDTH,
        220,
      );
    }
  }

  c = drawFurnitureTable(doc, c, font, bold, room.furniture);
  return c;
}

/** Espace logique du plateau moodboard (M8) — voir `packages/domain/src/generators/moodboard.ts`. */
const BOARD_LOGICAL_WIDTH = 1600;
const BOARD_LOGICAL_HEIGHT = 1200;
const BOARD_DRAW_WIDTH = CONTENT_WIDTH;
const BOARD_DRAW_HEIGHT = (BOARD_DRAW_WIDTH * BOARD_LOGICAL_HEIGHT) / BOARD_LOGICAL_WIDTH;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

/**
 * Redessine le plateau à partir des mêmes données de transform que l'éditeur
 * (docs/05 M8, `moodboard-editor.tsx`) — une reproduction fidèle des
 * positions/tailles, pas une simple liste : le PDF doit permettre de
 * reconnaître la composition visuelle, pas seulement lister son contenu.
 */
async function drawMoodboardSection(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  moodboard: DossierMoodboard,
): Promise<void> {
  const c = newPage(doc);
  drawHeading(c, moodboard.title, bold, 16);
  c.y -= 4;

  const boardTop = c.y;
  const boardLeft = MARGIN;
  const scaleX = BOARD_DRAW_WIDTH / BOARD_LOGICAL_WIDTH;
  const scaleY = BOARD_DRAW_HEIGHT / BOARD_LOGICAL_HEIGHT;

  c.page.drawRectangle({
    x: boardLeft,
    y: boardTop - BOARD_DRAW_HEIGHT,
    width: BOARD_DRAW_WIDTH,
    height: BOARD_DRAW_HEIGHT,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 0.97),
  });

  const sorted = [...moodboard.items].sort((a, b) => a.transform.z - b.transform.z);
  for (const item of sorted) {
    const x = boardLeft + item.transform.x * scaleX;
    const width = item.transform.w * scaleX;
    const height = item.transform.h * scaleY;
    // Repère PDF : origine en bas à gauche — l'axe Y du plateau (haut en bas) s'inverse ici.
    const y = boardTop - item.transform.y * scaleY - height;

    if (item.jpegBytes) {
      const image = await doc.embedJpg(ownedBytes(item.jpegBytes));
      c.page.drawImage(image, { x, y, width, height });
    } else if (item.colorHex) {
      const { r, g, b } = hexToRgb(item.colorHex);
      c.page.drawRectangle({ x, y, width, height, color: rgb(r, g, b) });
    } else {
      c.page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });
    }
  }

  let legendCursor: Cursor = { page: c.page, y: boardTop - BOARD_DRAW_HEIGHT - 24 };
  legendCursor = ensureSpace(doc, legendCursor, 20);
  legendCursor.page.drawText("Légende", {
    x: MARGIN,
    y: legendCursor.y,
    size: 13,
    font: bold,
  });
  legendCursor.y -= 18;

  const labeled = moodboard.items.filter((item) => item.label);
  if (labeled.length === 0) {
    drawParagraph(legendCursor, "Aucune légende pour ce moodboard.", font);
    return;
  }
  for (const item of labeled) {
    legendCursor = ensureSpace(doc, legendCursor, 16);
    drawParagraph(legendCursor, `• ${item.label}`, font);
  }
}

function drawJournalSection(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  entries: DossierJournalEntry[],
): void {
  let c = newPage(doc);
  drawHeading(c, "Journal de projet", bold, 16);

  for (const entry of entries) {
    c = ensureSpace(doc, c, 40);
    const kindLabel =
      JOURNAL_KIND_LABELS[entry.kind as keyof typeof JOURNAL_KIND_LABELS] ?? entry.kind;
    c.page.drawText(`[${kindLabel}] ${entry.title}`, {
      x: MARGIN,
      y: c.y,
      size: 12,
      font: bold,
    });
    c.y -= 16;
    drawParagraph(c, entry.body, font);
    c.y -= 10;
  }
}

export async function buildProjectDossierPdf(data: DossierData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const cursor = newPage(doc);
  drawCoverSection(cursor, font, bold, data);

  for (const room of data.rooms) {
    await drawRoomSection(doc, font, bold, room);
  }

  for (const moodboard of data.moodboards) {
    await drawMoodboardSection(doc, font, bold, moodboard);
  }

  if (data.journalEntries.length > 0) {
    drawJournalSection(doc, font, bold, data.journalEntries);
  }

  return doc.save();
}
