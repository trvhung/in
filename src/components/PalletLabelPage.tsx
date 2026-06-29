import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { PalletConfig } from '../types';
import { Barcode } from './Barcode';

/** Generate pallet codes from config */
function generateCodes(config: PalletConfig): string[] {
  const mm = String(config.month).padStart(2, '0');
  const yy = String(config.year).slice(-2);
  const uniqueCount = Math.ceil(config.quantity / 2);

  const codes: string[] = [];
  for (let i = 1; i <= uniqueCount; i++) {
    const seq = String(i).padStart(5, '0');
    const code = `PLT-${mm}${yy}-${seq}`;
    // Each code appears twice, except the last one if quantity is odd
    const repeat = (i === uniqueCount && config.quantity % 2 !== 0) ? 1 : 2;
    for (let r = 0; r < repeat; r++) {
      codes.push(code);
    }
  }
  return codes;
}

/** Calculate page count */
function getPageCount(totalLabels: number, perPage: number): number {
  return Math.ceil(totalLabels / perPage);
}

const LABELS_PER_PAGE = 40; // 10 columns x 4 rows
const LABEL_WIDTH = '22mm';
const LABEL_HEIGHT = '95mm';
const GAP = '4mm';

export function PalletLabelPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [config, setConfig] = useState<PalletConfig>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    quantity: 40,
  });
  const [showPrint, setShowPrint] = useState(false);

  const codes = useMemo(() => generateCodes(config), [config]);
  const uniqueCount = Math.ceil(config.quantity / 2);
  const firstCode = codes[0] || '';
  const lastUniqueCode = codes[codes.length - 1] || '';
  const totalPages = getPageCount(codes.length, LABELS_PER_PAGE);

  const handlePrint = () => {
    setShowPrint(true);
    // Delay print to allow render
    setTimeout(() => window.print(), 200);
  };

  // Split codes into pages
  const pages = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < codes.length; i += LABELS_PER_PAGE) {
      result.push(codes.slice(i, i + LABELS_PER_PAGE));
    }
    return result;
  }, [codes]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-3 no-print">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
      </div>

      {/* FORM (hidden when showing print) */}
      {!showPrint && (
        <div className="max-w-lg mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              Tạo Tem Pallet
            </h2>

            {/* Month */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Thang</label>
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
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Nam</label>
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
              <label className="block text-sm font-medium text-gray-600 mb-1.5">So luong tem</label>
              <input
                type="number"
                min={1}
                value={config.quantity}
                onChange={(e) => setConfig({ ...config, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Code preview */}
            {codes.length > 0 && (
              <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <div className="text-xs text-gray-500 mb-1">Ma tem se tao:</div>
                <div className="text-sm font-mono font-bold text-gray-800">
                  {firstCode} → {lastUniqueCode}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {uniqueCount} ma duy nhat x 2 = {codes.length} tem / {totalPages} to A3
                </div>
              </div>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Xem truoc & In
            </button>
          </div>
        </div>
      )}

      {/* PRINT VIEW (hidden on screen, visible when printing) */}
      {showPrint && (
        <div className="no-print mb-4 text-center pt-4">
          <button
            onClick={() => setShowPrint(false)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lai chinh sua
          </button>
          <button
            onClick={() => window.print()}
            className="ml-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            In ngay
          </button>
        </div>
      )}

      {/* PHYSICAL PRINT SHEETS */}
      <div className={showPrint ? '' : 'hidden'}>
        <style>{`
          @page {
            size: A3 portrait;
            margin: 0;
          }
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; }
          }
        `}</style>

        {pages.map((pageCodes, pageIndex) => (
          <div
            key={pageIndex}
            className="bg-white"
            style={{
              width: '297mm',
              height: '420mm',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignContent: 'flex-start',
              gap: GAP,
              padding: `${(420 - (4 * 95 + 3 * 4)) / 2}mm ${(297 - (10 * 22 + 9 * 4)) / 2}mm`,
              pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
              boxSizing: 'border-box',
            }}
          >
            {pageCodes.map((code, i) => (
              <div
                key={i}
                style={{
                  width: LABEL_WIDTH,
                  height: LABEL_HEIGHT,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Barcode rotated 90 degrees */}
                <div
                  style={{
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Barcode
                    value={code}
                    format="CODE128"
                    height={20}
                    width={1.2}
                    displayValue={false}
                    fontSize={7}
                    margin={0}
                  />
                </div>
                {/* Code text - also rotated 90 degrees, displayed vertically */}
                <div
                  style={{
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center center',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '7pt',
                    fontWeight: 400,
                    color: '#000',
                    whiteSpace: 'nowrap',
                    marginTop: '2mm',
                  }}
                >
                  {code}
                </div>
              </div>
            ))}

            {/* Fill empty slots to maintain grid */}
            {Array.from({ length: LABELS_PER_PAGE - pageCodes.length }, (_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  width: LABEL_WIDTH,
                  height: LABEL_HEIGHT,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
