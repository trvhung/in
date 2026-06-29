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

// 1mm = 96/25.4 px
const PX_PER_MM = 96 / 25.4; // ~3.7795

/**
 * Render barcode → pre-rotated 90° canvas.
 * Output: bars HORIZONTAL, image sized for direct PDF placement.
 */
function renderBarcodeDataURL(code: string, wMM: number, hMM: number): string {
  const wPx = Math.round(wMM * PX_PER_MM);  // target width after rotation
  const hPx = Math.round(hMM * PX_PER_MM);  // target height after rotation

  // Step 1: JsBarcode (bars VERTICAL) on temp canvas
  //   After 90° rotation: temp.width→height, temp.height→width
  //   We need: rotated.width=wPx, rotated.height=hPx
  //   So: temp.height=wPx, temp.width=hPx
  const temp = document.createElement('canvas');
  temp.width = hPx;
  temp.height = wPx;

  JsBarcode(temp, code, {
    format: 'CODE128',
    width: 1,
    height: wPx - 2,
    margin: 1,
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#000000',
  });
  // temp: hPx × wPx, bars vertical, white background

  // Step 2: Rotate 90° onto output canvas → bars HORIZONTAL
  const out = document.createElement('canvas');
  out.width = wPx;
  out.height = hPx;

  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(temp, -temp.width / 2, -temp.height / 2);
  ctx.restore();

  return out.toDataURL('image/png');
}

// ── Page ──
const PAGE_W = 297;
const PAGE_H = 420;
const MARGIN = 8;

// ── Grid ──
const COLS = 10;
const ROWS = 4;
const CELL_W = 28.1;
const CELL_H = 101.0;
const LABELS_PER_PAGE = COLS * ROWS;

// ── Cell content ──
const PADDING = 1.5;
const CW = CELL_W - 2 * PADDING;  // 25.1mm
const CH = CELL_H - 2 * PADDING;  // 98.0mm

// ── Barcode (pre-rotated, bars horizontal, fills CW) ──
const BC_W = 21;   // mm
const BC_H = 70;   // mm

// ── Text below barcode ──
const TEXT_H = 25;  // mm (fits 15pt mono rotated)
const GAP = 3;      // mm

// Total = 70+3+25 = 98mm = CH ✓

export async function generatePalletPDF(config: PalletConfig): Promise<Blob> {
  const codes = generateCodes(config);
  const totalPages = Math.ceil(codes.length / LABELS_PER_PAGE);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W, PAGE_H] });

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

      // Barcode image (pre-rotated: bars horizontal)
      const dataURL = renderBarcodeDataURL(code, BC_W, BC_H);

      // Position: centered horizontally, top of content area
      const bcX = cx + (CW - BC_W) / 2;
      const bcY = cy;

      doc.addImage(dataURL, 'PNG', bcX, bcY, BC_W, BC_H, undefined, 'FAST');

      // Text: centered in text zone below barcode
      const textX = cx + CW / 2;
      const textY = bcY + BC_H + GAP + TEXT_H / 2;

      doc.setFont('Courier', 'normal');
      doc.setFontSize(15);
      doc.text(code, textX, textY, {
        angle: 90,
        align: 'center',
        baseline: 'middle',
      });
    }
  }

  return doc.output('blob');
}
