import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';

// ── Nội dung tem thiết kế ngang 60×45mm, khi in xoay 90° (tem dọc 45×60mm) ──
// Mỗi trang PDF = 1 hàng 2 tem
const LABEL_W = 60;
const LABEL_H = 45;
const PER_ROW = 2;
export const DEFAULT_KLN_GAP = 2; // mm giữa 2 tem

// ── Barcode (ngang, căn giữa) ──
const BC_W = 50;       // mm
const BC_H = 24;       // mm
const BC_TOP = 5;      // mm

// ── Mã vị trí dưới barcode ──
const TEXT_GAP = 2.5;  // mm
const TEXT_SIZE = 22;  // pt
const TEXT_MAX_W = 54; // mm — tự thu nhỏ font nếu mã dài

/** Đọc file Excel/CSV, lấy cột "Vitri" (hoặc cột đầu tiên nếu không có tiêu đề) */
export async function parseKlnFile(file: File): Promise<string[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: false });
  if (rows.length === 0) return [];

  const normalize = (v: unknown) =>
    String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase();
  const headerIdx = rows[0].findIndex((c) => normalize(c) === 'vitri');
  const col = headerIdx >= 0 ? headerIdx : 0;
  const body = headerIdx >= 0 ? rows.slice(1) : rows;

  return body.map((r) => String(r[col] ?? '').trim()).filter(Boolean);
}

const PT_TO_MM = 25.4 / 72;
const CAP_HEIGHT = 0.72; // tỉ lệ chiều cao chữ hoa Helvetica so với cỡ chữ

/**
 * Vẽ 1 tem xoay 90° theo chiều kim đồng hồ vào ô dọc (LABEL_H × LABEL_W) tại (cellX, cellY).
 * Toạ độ thiết kế (u, v) trong khung ngang 60×45 → trang: x = cellX + LABEL_H - v, y = cellY + u
 */
function drawLabel(doc: jsPDF, code: string, cellX: number, cellY: number) {
  // Barcode CODE128 vẽ bằng hình chữ nhật vector để in sắc nét (vạch nằm ngang sau khi xoay)
  const data: { encodings?: { data: string }[] } = {};
  JsBarcode(data, code, { format: 'CODE128' });
  const bits = (data.encodings ?? []).map((e) => e.data).join('');
  const module = BC_W / bits.length;
  const bcU = (LABEL_W - BC_W) / 2;

  let i = 0;
  while (i < bits.length) {
    if (bits[i] === '1') {
      let j = i;
      while (j < bits.length && bits[j] === '1') j++;
      doc.rect(cellX + LABEL_H - BC_TOP - BC_H, cellY + bcU + i * module, BC_H, (j - i) * module, 'F');
      i = j;
    } else {
      i++;
    }
  }

  // Mã vị trí dưới barcode, căn giữa
  let size = TEXT_SIZE;
  doc.setFontSize(size);
  while (size > 8 && doc.getTextWidth(code) > TEXT_MAX_W) {
    size -= 1;
    doc.setFontSize(size);
  }
  const textU = (LABEL_W - doc.getTextWidth(code)) / 2;
  const baselineV = BC_TOP + BC_H + TEXT_GAP + size * PT_TO_MM * CAP_HEIGHT;
  doc.text(code, cellX + LABEL_H - baselineV, cellY + textU, { angle: -90 });
}

export function generateKlnPDF(codes: string[], copies = 1, gap = DEFAULT_KLN_GAP): Blob {
  const pageW = PER_ROW * LABEL_H + (PER_ROW - 1) * gap;
  const pageH = LABEL_W;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] });
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');

  const labels = codes.flatMap((code) => Array<string>(copies).fill(code));
  labels.forEach((code, i) => {
    const col = i % PER_ROW;
    if (i > 0 && col === 0) doc.addPage([pageW, pageH], 'landscape');
    drawLabel(doc, code, col * (LABEL_H + gap), 0);
  });

  return doc.output('blob');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadKlnPDF(codes: string[], copies = 1, gap = DEFAULT_KLN_GAP) {
  const name = codes.length === 1 ? codes[0] : `${codes[0]}_${codes[codes.length - 1]}`;
  downloadBlob(generateKlnPDF(codes, copies, gap), `tem-kln-${name}.pdf`);
}

/** File mẫu: cột Vitri */
export function downloadKlnTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([['Vitri'], ['KLN26-1-1'], ['KLN26-1-2'], ['KLN26-1-3'], ['KLN26-1-4']]);
  ws['!cols'] = [{ wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vitri');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'mau-tem-kln.xlsx',
  );
}
