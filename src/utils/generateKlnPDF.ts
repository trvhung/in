import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';

// ── Tem 60×45mm, mỗi trang PDF = 1 tem ──
const LABEL_W = 60;
const LABEL_H = 45;

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

/** Vẽ barcode CODE128 bằng hình chữ nhật vector để in sắc nét */
function drawBarcode(doc: jsPDF, code: string, x: number, y: number, w: number, h: number) {
  const data: { encodings?: { data: string }[] } = {};
  JsBarcode(data, code, { format: 'CODE128' });
  const bits = (data.encodings ?? []).map((e) => e.data).join('');
  const module = w / bits.length;

  let i = 0;
  while (i < bits.length) {
    if (bits[i] === '1') {
      let j = i;
      while (j < bits.length && bits[j] === '1') j++;
      doc.rect(x + i * module, y, (j - i) * module, h, 'F');
      i = j;
    } else {
      i++;
    }
  }
}

export function generateKlnPDF(codes: string[], copies = 1): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [LABEL_W, LABEL_H] });
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');

  let first = true;
  for (const code of codes) {
    for (let c = 0; c < copies; c++) {
      if (!first) doc.addPage([LABEL_W, LABEL_H], 'landscape');
      first = false;

      drawBarcode(doc, code, (LABEL_W - BC_W) / 2, BC_TOP, BC_W, BC_H);

      let size = TEXT_SIZE;
      doc.setFontSize(size);
      while (size > 8 && doc.getTextWidth(code) > TEXT_MAX_W) {
        size -= 1;
        doc.setFontSize(size);
      }
      doc.text(code, LABEL_W / 2, BC_TOP + BC_H + TEXT_GAP, { align: 'center', baseline: 'top' });
    }
  }

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

export function downloadKlnPDF(codes: string[], copies = 1) {
  const name = codes.length === 1 ? codes[0] : `${codes[0]}_${codes[codes.length - 1]}`;
  downloadBlob(generateKlnPDF(codes, copies), `tem-kln-${name}.pdf`);
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
