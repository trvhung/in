import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { ArrowLeft, Download, Eye, FileSpreadsheet, Upload, X } from 'lucide-react';
import { DEFAULT_KLN_GAP, downloadKlnPDF, downloadKlnTemplate, parseKlnFile } from '../utils/generateKlnPDF';

const PREVIEW_LIMIT = 6;

/** Xem trước tem 60×45mm (4px = 1mm) xoay 90° thành tem dọc 45×60mm, bố cục khớp với PDF */
function KlnLabelPreview({ code }: { code: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, code, { format: 'CODE128', displayValue: false, margin: 0, height: 96, width: 2 });
      svgRef.current.setAttribute('preserveAspectRatio', 'none');
      svgRef.current.style.width = '200px';
      svgRef.current.style.height = '96px';
    } catch (err) {
      console.error('JsBarcode failed to render barcode:', err);
    }
  }, [code]);

  return (
    <div className="bg-white border border-gray-300 rounded-md relative overflow-hidden shrink-0" style={{ width: 180, height: 240 }}>
      <div
        className="absolute flex flex-col items-center"
        style={{ width: 240, height: 180, left: -30, top: 30, paddingTop: 20, transform: 'rotate(90deg)' }}
      >
        <svg ref={svgRef} />
        <div
          className="font-bold text-black whitespace-nowrap leading-none"
          style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 29, marginTop: 10 }}
        >
          {code}
        </div>
      </div>
    </div>
  );
}

export function KlnLabelPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [copies, setCopies] = useState(1);
  const [gap, setGap] = useState(DEFAULT_KLN_GAP);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const list = await parseKlnFile(file);
      if (list.length === 0) {
        setError('Không tìm thấy mã vị trí nào trong file (cần cột "Vitri").');
        setCodes([]);
      } else {
        setCodes(list);
      }
      setFileName(file.name);
    } catch (err) {
      console.error('Parse failed:', err);
      setError('Không đọc được file. Vui lòng dùng file Excel (.xlsx, .xls) hoặc .csv.');
      setCodes([]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setCodes([]);
    setFileName('');
    setError('');
  };

  const handleDownload = () => {
    try {
      downloadKlnPDF(codes, copies, gap);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Có lỗi khi tạo file. Vui lòng thử lại.');
    }
  };

  const total = codes.length * copies;
  const previewLabels = codes.flatMap((code) => Array<string>(copies).fill(code)).slice(0, PREVIEW_LIMIT);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-violet-600" />
            Tạo Tem KLN
          </h2>

          {/* Upload */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-600">File danh sách vị trí</label>
              <button
                onClick={downloadKlnTemplate}
                className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Tải file mẫu
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {fileName ? (
              <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-violet-600 shrink-0" />
                  <span className="truncate">{fileName}</span>
                  <span className="text-xs text-gray-400 shrink-0">({codes.length} mã)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-violet-600 hover:text-violet-700 cursor-pointer"
                  >
                    Đổi file
                  </button>
                  <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 cursor-pointer" title="Xoá">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className="w-full border-2 border-dashed border-gray-300 hover:border-violet-400 hover:bg-violet-50/40 rounded-xl py-8 px-4 flex flex-col items-center gap-2 text-sm text-gray-500 transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <span>Chọn hoặc kéo thả file Excel / CSV</span>
                <span className="text-xs text-gray-400">Cột tiêu đề "Vitri", mỗi dòng một mã (vd KLN26-1-1)</span>
              </button>
            )}
            {error && <div className="text-xs text-red-600 mt-1.5">{error}</div>}
          </div>

          {/* Copies + Gap */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Số tem mỗi mã</label>
              <input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Khoảng cách 2 tem (mm)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={gap}
                onChange={(e) => setGap(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Preview */}
          {codes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-2">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Xem trước</span>
                <span className="text-[10px] text-gray-400">
                  — tem dọc 45×60mm, mỗi trang PDF 1 hàng 2 tem ({(90 + gap).toFixed(1).replace(/\.0$/, '')}×60mm)
                </span>
              </div>
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-3">
                {Array.from({ length: Math.ceil(previewLabels.length / 2) }, (_, row) => (
                  <div key={row} className="flex" style={{ gap: gap * 4 }}>
                    {previewLabels.slice(row * 2, row * 2 + 2).map((code, i) => (
                      <Fragment key={`${code}-${i}`}><KlnLabelPreview code={code} /></Fragment>
                    ))}
                  </div>
                ))}
              </div>
              {total > PREVIEW_LIMIT && (
                <div className="text-xs text-gray-400 text-center mt-1.5">
                  … và {total - PREVIEW_LIMIT} tem khác
                </div>
              )}
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={codes.length === 0}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
              codes.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 text-white active:scale-[0.98] cursor-pointer'
            }`}
          >
            <Download className="w-4 h-4" />
            Tải PDF ({total} tem)
          </button>
        </div>
      </div>
    </div>
  );
}
