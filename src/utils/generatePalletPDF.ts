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

/** Render a Code128 barcode to a data URL via off-screen canvas */
function renderBarcodeDataURL(code: string): string {
  const canvas = document.createElement('canvas');
  // JsBarcode height = barcode width in label after 90° rotation (target: 15mm ≈ 57px)
  // Module width: ~1.8 for ~74mm total barcode length after rotation
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 1.8,
    height: 57,
    margin: 8,       // ~2mm quiet zone each side
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#000000',
  });
  return canvas.toDataURL('image/png');
}

// Page constants (mm)
const PAGE_W = 297;
const PAGE_H = 420;
const LABEL_W = 22;
const LABEL_H = 95;
const COLS = 10;
const ROWS = 4;
const GAP = 0; // labels placed close together
const LABELS_PER_PAGE = COLS * ROWS; // 40

// Offsets to center grid on page
const gridW = COLS * LABEL_W + (COLS - 1) * GAP; // 220mm
const gridH = ROWS * LABEL_H + (ROWS - 1) * GAP; // 380mm
const offsetX = (PAGE_W - gridW) / 2; // 38.5mm
const offsetY = (PAGE_H - gridH) / 2; // 20mm

// Label internal layout (after 90° rotation)
const BARCODE_W = 15;   // mm - barcode width in label
const BARCODE_H = 73;   // mm - barcode height in label
const TEXT_H = 16;      // mm - text height
const BARCODE_TEXT_GAP = 1.5; // mm

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

      const labelX = offsetX + col * (LABEL_W + GAP);
      const labelY = offsetY + row * (LABEL_H + GAP);

      const code = pageCodes[i];

      // Render barcode to image
      const barcodeDataURL = renderBarcodeDataURL(code);

      // Calculate barcode position within label (centered horizontally)
      const barcodeX = labelX + (LABEL_W - BARCODE_W) / 2;
      const barcodeY = labelY + (LABEL_H - BARCODE_H - BARCODE_TEXT_GAP - TEXT_H) / 2;

      // Add rotated barcode image
      // The image is horizontal; rotate 90° to make bars horizontal (scan vertically)
      doc.addImage(
        barcodeDataURL,
        'PNG',
        barcodeX,
        barcodeY,
        BARCODE_W,
        BARCODE_H,
        undefined,
        'FAST',
        90 // rotation in degrees
      );

      // Add rotated text below barcode
      const textY = barcodeY + BARCODE_H + BARCODE_TEXT_GAP;
      const textX = labelX + LABEL_W / 2;

      doc.setFont('Arial', 'normal');
      doc.setFontSize(7);

      doc.text(code, textX, textY, {
        angle: 90,
        align: 'center',
        baseline: 'top',
      });
    }
  }

  return doc.output('blob');
}
