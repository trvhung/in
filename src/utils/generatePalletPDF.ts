import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { PalletConfig } from '../types';

function generateCodes(config: PalletConfig): string[] {
  const mm = String(config.month).padStart(2, '0');
  const yy = String(config.year).slice(-2);
  const uniqueCount = Math.ceil(config.quantity / 2);
  const codes: string[] = [];
  for (let i = 1; i <= uniqueCount; i++) {
    const seq = String(i).padStart(5, '0');
    const code = `PLT-${mm}${yy}-${seq}`;
    const repeat = i === uniqueCount && config.quantity % 2 !== 0 ? 1 : 2;
    for (let r = 0; r < repeat; r++) codes.push(code);
  }
  return codes;
}

/** Render barcode to data URL (normal horizontal, bars vertical) */
function renderBarcodeDataURL(code: string, wPx: number, hPx: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 1,
    height: hPx - 4,
    margin: 2,
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#000000',
  });
  return canvas.toDataURL('image/png');
}

// ── A3 landscape ──
const PAGE_W = 420;
const PAGE_H = 297;
const MARGIN = 2;

// ── Grid: 4 columns × 10 rows = 40 labels ──
const COLS = 4;
const ROWS = 10;
const CELL_W = 104;
const CELL_H = 29.3;
const LABELS_PER_PAGE = COLS * ROWS;
// 4×104 = 416 + 2×2 = 420 ✓ | 10×29.3 = 293 + 2×2 = 297 ✓

// ── Cell content ──
const PADDING = 1.5;
const CW = CELL_W - 2 * PADDING;   // 101mm
const CH = CELL_H - 2 * PADDING;   // 26.3mm

// ── Barcode (horizontal, fills content width) ──
const BC_W = CW;       // mm — full content width
const BC_H_MM = 17;    // mm
const BC_H_PX = 64;    // px — barcode image height

// ── Text below barcode ──
const TEXT_H_MM = 7;   // mm (14pt bold)
const GAP = 0.5;       // mm
// Total: 17 + 0.5 + 7 = 24.5mm (fits 26.3mm)

export async function generatePalletPDF(config: PalletConfig): Promise<Blob> {
  const codes = generateCodes(config);
  const totalPages = Math.ceil(codes.length / LABELS_PER_PAGE);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_W, PAGE_H] });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    const pageCodes = codes.slice(page * LABELS_PER_PAGE, (page + 1) * LABELS_PER_PAGE);

    for (let i = 0; i < pageCodes.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = MARGIN + col * CELL_W;
      const cellY = MARGIN + row * CELL_H;
      const cx = cellX + PADDING;
      const cy = cellY + PADDING;

      const code = pageCodes[i];

      // Barcode — horizontal, bars vertical, fills content width
      const bcW = BC_W;
      const bcH = BC_H_MM;
      const bcX = cx;
      const bcY = cy + (CH - BC_H_MM - GAP - TEXT_H_MM) / 2; // center vertically
      const bcPxW = Math.round(bcW * 3.78);
      const dataURL = renderBarcodeDataURL(code, bcPxW, BC_H_PX);
      doc.addImage(dataURL, 'PNG', bcX, bcY, bcW, bcH, undefined, 'FAST');

      // Text — below barcode, centered, mono
      const textY = bcY + bcH + GAP;
      doc.setFont('Courier', 'bold');
      doc.setFontSize(14);
      doc.text(code, cx + CW / 2, textY, { align: 'center', baseline: 'top' });
    }
  }

  return doc.output('blob');
}
