import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Eye } from 'lucide-react';
import { PalletConfig } from '../types';
import { generatePalletPDF } from '../utils/generatePalletPDF';
import { Barcode } from './Barcode';

const MAX_QUANTITY = 10000;

export function PalletLabelPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [config, setConfig] = useState<PalletConfig>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    quantity: 40,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const uniqueCount = Math.ceil(config.quantity / 2);
  const totalPages = Math.ceil(config.quantity / 40);
  const mm = String(config.month).padStart(2, '0');
  const yy = String(config.year).slice(-2);
  const firstCode = `PLT-${mm}${yy}-${String(1).padStart(5, '0')}`;
  const lastCode = `PLT-${mm}${yy}-${String(uniqueCount).padStart(5, '0')}`;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const blob = await generatePalletPDF(config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pallet-${mm}${yy}-${String(uniqueCount).padStart(5, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Có lỗi khi tạo PDF. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

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

      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" />
            Tạo Tem Pallet
          </h2>

          {/* Month */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Tháng</label>
            <select
              value={config.month}
              onChange={(e) => setConfig({ ...config, month: parseInt(e.target.value) })}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Năm</label>
            <select
              value={config.year}
              onChange={(e) => setConfig({ ...config, year: parseInt(e.target.value) })}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Array.from({ length: 11 }, (_, i) => now.getFullYear() + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Số lượng tem <span className="text-gray-400 font-normal">(tối đa {MAX_QUANTITY.toLocaleString('vi-VN')})</span>
            </label>
            <input
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={config.quantity}
              onChange={(e) => {
                const v = Math.max(1, Math.min(MAX_QUANTITY, parseInt(e.target.value) || 1));
                setConfig({ ...config, quantity: v });
              }}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Code preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
            <div className="text-xs text-gray-500 mb-1">Mã tem sẽ tạo:</div>
            <div className="text-sm font-mono font-bold text-gray-800">
              {firstCode} → {lastCode}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {uniqueCount} mã duy nhất × 2 = {config.quantity} tem / {totalPages} tờ A3
            </div>
          </div>

          {/* Label Demo Preview — ngang để dễ xem */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Demo tem</span>
              <span className="text-[10px] text-gray-400">— 27.3×101.0mm (in dọc, xem ngang, gap 2mm giữa cặp mã)</span>
            </div>
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 flex justify-center">
              <div
                className="bg-white flex flex-col items-center justify-center"
                style={{
                  width: '260px',
                  border: 'none',
                  padding: 0,
                }}
              >
                {/* Barcode — ngang, sát mép */}
                <div className="w-full flex items-center justify-center overflow-hidden" style={{ height: '44px' }}>
                  <Barcode
                    value={firstCode}
                    format="CODE128"
                    height={40}
                    width={1.3}
                    displayValue={false}
                    margin={0}
                  />
                </div>
                {/* Mã — dưới barcode, căn giữa, mono 14pt bold */}
                <div
                  style={{
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: '14pt',
                    fontWeight: 700,
                    color: '#000',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                    textAlign: 'center',
                  }}
                >
                  {firstCode}
                </div>
              </div>
            </div>
          </div>

          {/* Download PDF button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
              isGenerating
                ? 'bg-emerald-100 text-emerald-500 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tạo PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Tải PDF ({config.quantity} tem)
              </>
            )}
          </button>

          {config.quantity >= 1000 && (
            <p className="text-xs text-amber-600 mt-3 text-center">
              ⚠️ Số lượng lớn, quá trình tạo PDF có thể mất vài giây.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
