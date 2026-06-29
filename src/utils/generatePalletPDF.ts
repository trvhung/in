import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { PalletConfig } from '../types';

/** Generate pallet codes from config */
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
 * Render Code128 barcode to a PRE-ROTATED data URL.
 *
 * Step 1: JsBarcode draws on a temp canvas (bars VERTICAL).
 *   - width: ~284px (189 modules × 1.5px)
 *   - height: 76px (bar length → after rotation this is the barcode WIDTH in label ≈ 20mm)
 *
 * Step 2: Content is rotated 90° onto output canvas.
 *   - output: 76px wide × ~284px tall
 *   - bars are now HORIZONTAL
 *
 * Step 3: In PDF, placed at (x, y) with size (20mm, 75mm) — NO rotation needed.
 *   - This avoids jsPDF addImage rotation which rotates around center
 *     and causes the image to spill outside the label bounding box.
 */
function renderBarcodeDataURL(code: string): string {
  // Step 1: JsBarcode → temp canvas (bars vertical)
  const temp = document.createElement('canvas');
  JsBarcode(temp, code, {
    format: 'CODE128',
    width: 1.5,
    height: 76,
    margin: 0,
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#000000',
  });
  // temp is now: temp.width × temp.height = ~284px × 76px, bars VERTICAL

  // Step 2: Rotate 90° onto output canvas → bars become HORIZONTAL
  const out = document.createElement('canvas');
  out.width = temp.height;   // 76px → ~20mm width in label
  out.height = temp.width;   // ~284px → ~75mm height in label

  const ctx = out.getContext('2d')!;
  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  // Rotate 90° clockwise around center of output
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(temp, -temp.width / 2, -temp.height / 2);

  return out.toDataURL('image/png');
}

// A3 portrait page (mm)
const PAGE_W = 297;
const PAGE_H = 420;

// Label size (mm) — portrait
const LABEL_W = 22;
const LABEL_H = 95;

// Grid: 10 columns × 4 rows = 40 labels per page
const COLS = 10;
const ROWS = 4;
const GAP = 0;
const LABELS_PER_PAGE = COLS * ROWS;

// Center grid on A3 page
const gridW = COLS * LABEL_W + (COLS - 1) * GAP; // 220mm
const gridH = ROWS * LABEL_H + (ROWS - 1) * GAP; // 380mm
const offsetX = (PAGE_W - gridW) / 2; // 38.5mm
const offsetY = (PAGE_H - gridH) / 2; // 20mm

// Barcode dimensions within the 22×95mm label (after 90° rotation)
const BARCODE_W = 20;  // mm — barcode width in label (fills 22mm with 1mm margin each side)
const BARCODE_H = 75;  // mm — barcode height in label
const TEXT_H = 14;     // mm — text area height
const GAP_BC_TEXT = 2; // mm — gap between barcode and text

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

      // Label top-left position on page
      const labelX = offsetX + col * (LABEL_W + GAP);
      const labelY = offsetY + row * (LABEL_H + GAP);

      const code = pageCodes[i];

      // Render barcode to image (horizontal, bars vertical)
      const barcodeDataURL = renderBarcodeDataURL(code);

      // Calculate barcode position within the portrait label.
      // Barcode + gap + text are centered vertically in the 95mm label.
      const contentH = BARCODE_H + GAP_BC_TEXT + TEXT_H; // 75 + 2 + 14 = 91mm
      const contentTop = labelY + (LABEL_H - contentH) / 2; // center in 95mm

      const barcodeX = labelX + (LABEL_W - BARCODE_W) / 2; // center in 22mm width
      const barcodeY = contentTop;

      // Add pre-rotated barcode image (bars already horizontal, no PDF rotation needed)
      doc.addImage(
        barcodeDataURL,
        'PNG',
        barcodeX,
        barcodeY,
        BARCODE_W,
        BARCODE_H,
        undefined,
        'FAST'
      );

      // Text position: below barcode, centered
      const textX = labelX + LABEL_W / 2;
      const textY = barcodeY + BARCODE_H + GAP_BC_TEXT;

      doc.setFont('Arial', 'normal');
      doc.setFontSize(10);

      // Text rotated 90° (vertical), same orientation as barcode
      doc.text(code, textX, textY, {
        angle: 90,
        align: 'center',
        baseline: 'top',
      });
    }
  }

  return doc.output('blob');
}
