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
 * Render Code128 barcode to data URL.
 * Barcode is drawn horizontally (bars vertical) by JsBarcode.
 * In the PDF, it gets rotated 90° so bars become horizontal,
 * filling the 22mm label width, extending ~75mm down the 95mm label height.
 *
 * JsBarcode `height` → after 90° rotation → barcode width in label (~20mm)
 * Total barcode pixel width → after 90° rotation → barcode height in label (~75mm)
 */
function renderBarcodeDataURL(code: string): string {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 1.5,        // module width → ~75mm after rotation
    height: 72,        // ~20mm after rotation (fits 22mm label with 1mm each side)
    margin: 0,         // no quiet zone margin
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#000000',
  });
  return canvas.toDataURL('image/png');
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

      // Add barcode image rotated 90° — bars become horizontal
      doc.addImage(
        barcodeDataURL,
        'PNG',
        barcodeX,
        barcodeY,
        BARCODE_W,
        BARCODE_H,
        undefined,
        'FAST',
        90
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
