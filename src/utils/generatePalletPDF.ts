import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { PalletConfig } from '../types';

/** Generate pallet codes: each serial repeated 2×, left→right top→bottom */
function generateCodes(config: PalletConfig): string[] {
  const mm = String(config.month).padStart(2, '0');
  const yy = String(config.year).slice(-2);
  const uniqueCount = Math.ceil(config.quantity / 2);

  const codes: string[] = [];
  for (let i = 1; i <= uniqueCount; i++) {
    const seq = String(i).padStart(5, '0');
    const code = `PLT-${mm}${yy}-${seq}`;
    const repeat = i === uniqueCount && config.quantity % 2 !== 0 ? 1 : 2;
    for (let r = 0; r < repeat; r++) {
      codes.push(code);
    }
  }
  return codes;
}

/**
 * Render Code128 barcode → pre-rotated 90° data URL.
 *
 * Step 1: JsBarcode draws on temp canvas with bars VERTICAL.
 *   - width: ~302px (189 modules × 1.6px) → ~80mm after rotation
 *   - height: 79px → ~21mm after rotation (barcode width in label)
 *
 * Step 2: Rotate 90° onto output canvas → bars become HORIZONTAL.
 *   - output: 79px wide × ~302px tall
 *
 * Step 3: Place in PDF at (x, y) with (21mm, 80mm) — NO PDF rotation.
 */
function renderBarcodeDataURL(code: string): string {
  const temp = document.createElement('canvas');
  JsBarcode(temp, code, {
    format: 'CODE128',
    width: 1.6,
    height: 79,
    margin: 0,
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#000000',
  });

  const out = document.createElement('canvas');
  out.width = temp.height;   // 79px → ~21mm width in label
  out.height = temp.width;   // ~302px → ~80mm height in label

  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(temp, -temp.width / 2, -temp.height / 2);

  return out.toDataURL('image/png');
}

// ── A3 page (mm) ──
const PAGE_W = 297;
const PAGE_H = 420;
const MARGIN = 8; // lề 8mm

// ── Grid ──
const COLS = 10;
const ROWS = 4;
const CELL_W = 28.1;   // ô tem rộng
const CELL_H = 101.0;  // ô tem cao
const GAP = 0;
const LABELS_PER_PAGE = COLS * ROWS; // 40

// Verify fit: 10×28.1 = 281 + 2×8 = 297 ✓ | 4×101 = 404 + 2×8 = 420 ✓

// ── Cell internals ──
const PADDING = 1.5;           // padding trong ô
const CONTENT_W = CELL_W - 2 * PADDING; // 25.1mm
const CONTENT_H = CELL_H - 2 * PADDING; // 98.0mm

// ── Barcode within content ──
const BARCODE_W = 21;   // mm — width in content (quiets ~2mm each side)
const BARCODE_H = 80;   // mm — height in content

// ── Text ──
const TEXT_H = 14;      // mm
const GAP_BC_TEXT = 2;  // mm

// ── Content vertical centering ──
const CONTENT_TOTAL = BARCODE_H + GAP_BC_TEXT + TEXT_H; // 96mm
const CONTENT_TOP_OFFSET = (CONTENT_H - CONTENT_TOTAL) / 2; // 1mm within content

export async function generatePalletPDF(config: PalletConfig): Promise<Blob> {
  const codes = generateCodes(config);
  const totalPages = Math.ceil(codes.length / LABELS_PER_PAGE);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, PAGE_H],
  });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    const pageCodes = codes.slice(page * LABELS_PER_PAGE, (page + 1) * LABELS_PER_PAGE);

    for (let i = 0; i < pageCodes.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      // Cell top-left on page
      const cellX = MARGIN + col * (CELL_W + GAP);
      const cellY = MARGIN + row * (CELL_H + GAP);

      // Content area (inside padding)
      const contentX = cellX + PADDING;
      const contentY = cellY + PADDING;

      const code = pageCodes[i];

      // Barcode image (pre-rotated)
      const barcodeDataURL = renderBarcodeDataURL(code);

      // Barcode position: centered horizontally in content, at content top offset
      const bcX = contentX + (CONTENT_W - BARCODE_W) / 2;
      const bcY = contentY + CONTENT_TOP_OFFSET;

      doc.addImage(barcodeDataURL, 'PNG', bcX, bcY, BARCODE_W, BARCODE_H, undefined, 'FAST');

      // Text: below barcode, centered, rotated 90° (vertical)
      const textX = contentX + CONTENT_W / 2;
      const textY = bcY + BARCODE_H + GAP_BC_TEXT;

      doc.setFont('Courier', 'normal');
      doc.setFontSize(10);

      doc.text(code, textX, textY, {
        angle: 90,
        align: 'center',
        baseline: 'top',
      });
    }
  }

  return doc.output('blob');
}
