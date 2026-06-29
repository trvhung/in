import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
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
const MARGIN = 1;

// ── Grid: 4 columns × 10 rows = 40 labels ──
const COLS = 4;
const ROWS = 10;
const CELL_W = 104.5;
const CELL_H = 29.5;
const LABELS_PER_PAGE = COLS * ROWS;
// 4×104.5 = 418 + 2×1 = 420 ✓ | 10×29.5 = 295 + 2×1 = 297 ✓

// ── Cell content ──
const PADDING = 1.5;
const CW = CELL_W - 2 * PADDING;   // 101.5mm
const CH = CELL_H - 2 * PADDING;   // 26.5mm

// ── Barcode (horizontal, fills content width) ──
const BC_W = CW;       // mm — full content width
const BC_H_MM = 17;    // mm
const BC_H_PX = 64;    // px — barcode image height

// ── Text below barcode ──
const TEXT_H_MM = 7;   // mm (14pt bold)
const GAP = 0.5;       // mm
// Total: 17 + 0.5 + 7 = 24.5mm (fits 26.3mm)

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function generatePalletPDF(config: PalletConfig): Promise<Blob> {
  const codes = generateCodes(config);
  const totalPages = Math.ceil(codes.length / LABELS_PER_PAGE);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_W, PAGE_H] });
  const barcodeCache = new Map<string, string>(); // cache rendered barcodes
  const bcPxW = Math.round(BC_W * 3.78);

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

      // Barcode — cached per unique code
      let dataURL = barcodeCache.get(code);
      if (!dataURL) {
        dataURL = renderBarcodeDataURL(code, bcPxW, BC_H_PX);
        barcodeCache.set(code, dataURL);
      }

      const bcX = cx;
      const bcY = cy + (CH - BC_H_MM - GAP - TEXT_H_MM) / 2;
      doc.addImage(dataURL, 'PNG', bcX, bcY, BC_W, BC_H_MM, undefined, 'FAST');

      // Text — below barcode, centered, mono
      const textY = bcY + BC_H_MM + GAP;
      doc.setFont('Courier', 'bold');
      doc.setFontSize(14);
      doc.text(code, cx + CW / 2, textY, { align: 'center', baseline: 'top' });
    }

    // Yield to event loop every page to keep UI responsive
    if (page % 2 === 0) {
      await delay(0);
    }
  }

  return doc.output('blob');
}

/** Generate Excel file with unique pallet codes (no duplicates) */
function generateExcel(codes: string[]): Blob {
  const unique = [...new Set(codes)];
  const data = unique.map((code, i) => ({
    STT: i + 1,
    'Mã Pallet': code,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 8 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách mã Pallet');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Generate PDF + Excel, zip together, download */
export async function downloadPalletZip(config: PalletConfig): Promise<void> {
  const codes = generateCodes(config);
  const mm = String(config.month).padStart(2, '0');
  const yy = String(config.year).slice(-2);
  const uniqueCount = Math.ceil(config.quantity / 2);
  const prefix = `pallet-${mm}${yy}-${String(uniqueCount).padStart(5, '0')}`;

  const [pdfBlob, xlsxBlob] = await Promise.all([
    generatePalletPDF(config),
    Promise.resolve(generateExcel(codes)),
  ]);

  const zip = new JSZip();
  zip.file(`${prefix}.pdf`, pdfBlob);
  zip.file(`${prefix}.xlsx`, xlsxBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
