import { LabelTemplate, Product } from '../types';
import { Barcode } from './Barcode';
import { X, Printer, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface PrintLayoutProps {
  products: Product[];
  template: LabelTemplate;
  onClose: () => void;
}

export function PrintLayout({ products, template, onClose }: PrintLayoutProps) {
  // Generate flat array of labels to print
  const labelsToPrint = products.flatMap((p) =>
    Array.from({ length: p.quantity }, () => p)
  );

  const formatPrice = (price: number) => {
    if (price === 0) return '0đ';
    return price.toLocaleString('vi-VN') + 'đ';
  };

  const getDiscountPercent = (product: Product) => {
    if (product.price > 0 && product.comparePrice && product.comparePrice > product.price) {
      return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
    }
    return 50; // Fallback default
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  // Define CSS styles based on selected template
  const getGridClass = () => {
    switch (template.columns) {
      case 1:
        return 'grid-cols-1 max-w-[280px]';
      case 2:
        return 'grid-cols-2 max-w-[500px]';
      case 3:
      default:
        return 'grid-cols-3 max-w-[700px]';
    }
  };

  const getLabelStyle = () => {
    switch (template.id) {
      case 'sale-yellow':
        return {
          width: '280px',
          height: '160px',
          fontSize: '12px',
        };
      case 'single-small':
        return {
          width: '180px',
          height: '110px',
          fontSize: '11px',
        };
      case 'long-bien':
        return {
          width: '220px',
          height: '140px',
          fontSize: '12px',
        };
      case 'supermarket':
        return {
          width: '150px',
          height: '90px',
          fontSize: '10px',
        };
      default:
        return {
          width: '220px',
          height: '140px',
          fontSize: '12px',
        };
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 text-white overflow-y-auto p-4 md:p-8 no-print"
    >
      
      {/* Print Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl w-full mx-auto bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl mb-6">
        <div>
          <h1 className="font-bold text-lg md:text-xl text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400 animate-pulse" />
            Sẵn sàng in mã vạch!
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Đã tạo <strong className="text-white">{labelsToPrint.length} tem</strong> theo mẫu{' '}
            <strong className="text-white">{template.name}</strong>. Hãy ấn nút in bên phải.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition-all flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Đóng Preview
          </button>

          <button
            onClick={handleTriggerPrint}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Bắt đầu In (Ctrl + P)
          </button>
        </div>
      </div>

      {/* Printing Tips */}
      <div className="max-w-5xl w-full mx-auto bg-blue-950/40 border border-blue-900/50 rounded-xl p-4 text-xs text-blue-300 flex items-start gap-2.5 mb-6">
        <ShieldAlert className="w-4.5 h-4.5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-200">Mẹo thiết lập máy in: </span>
          Tại giao diện in của hệ thống, chọn máy in nhãn chuyên dụng của bạn, thiết lập Khổ giấy khớp với{' '}
          <strong className="text-white">{template.name} ({template.width} x {template.height})</strong>, 
          đặt tỷ lệ là <strong className="text-white">Default / Tự nhiên</strong> và bỏ tích ô <strong className="text-white">Headers and footers (Tiêu đề và chân trang)</strong> để tem in ra được ngay ngắn, vừa vặn nhất!
        </div>
      </div>

      {/* Layout Grid Preview */}
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="flex-1 flex flex-col items-center justify-center py-6"
      >
        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">
          Hình ảnh tem thực tế sẽ in ra giấy
        </div>

        <div className={`grid gap-4 justify-center bg-white text-black p-8 rounded-2xl shadow-inner border border-slate-700/30 ${getGridClass()}`}>
          {labelsToPrint.map((p, index) => {
            const size = getLabelStyle();

            if (template.id === 'sale-yellow') {
              return (
                <div
                  key={index}
                  className="bg-[#FFEE00] flex flex-col justify-between text-black transition-all relative shrink-0 select-none text-left p-3.5"
                  style={{
                    width: size.width,
                    height: size.height,
                  }}
                >
                  {/* Top Row: Red Box + Product Name */}
                  <div className="flex gap-2.5 items-start w-full">
                    {/* Red Box in top-left */}
                    <div className="bg-[#E30613] text-white flex flex-col items-center justify-center p-1.5 font-bold leading-none w-[64px] h-[64px] shrink-0 rounded select-none shadow-xs">
                      <div className="text-[10px] tracking-widest uppercase font-black">SALE</div>
                      <div className="text-[22px] font-black mt-1 leading-none tracking-tighter">
                        {getDiscountPercent(p)}%
                      </div>
                    </div>

                    {/* Product Name on the top-right */}
                    {template.showName && (
                      <div className="text-[12px] font-extrabold text-slate-950 leading-tight line-clamp-3 uppercase tracking-tight flex-1 pt-0.5">
                        {p.name}
                      </div>
                    )}
                  </div>

                  {/* Middle Row: SKU (Left) & Giá niêm yết (Right) */}
                  <div className="flex justify-between items-end mt-2 w-full px-0.5">
                    {/* SKU */}
                    {template.showSku && (
                      <div className="text-[11px] font-extrabold text-slate-900 tracking-wide font-sans">
                        {p.sku}
                      </div>
                    )}

                    {/* Giá niêm yết */}
                    {template.showComparePrice && p.comparePrice && p.comparePrice > 0 ? (
                      <span className="text-[12px] text-slate-700 line-through font-bold tracking-tight">
                        {p.comparePrice.toLocaleString('vi-VN')}
                      </span>
                    ) : null}
                  </div>

                  {/* Bottom Row: Giant Promo Price */}
                  <div className="flex items-baseline justify-between -mt-0.5 w-full px-0.5">
                    {template.showPrice && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[30px] font-black text-[#E30613] leading-none tracking-tight">
                          {p.price.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-[13px] font-black text-[#E30613] ml-0.5 tracking-wider">VND</span>
                      </div>
                    )}
                  </div>

                  {/* Toggleable Barcode overlay */}
                  {template.showBarcode !== false && (
                    <div className="absolute right-3.5 bottom-12 bg-white px-1 py-0.5 rounded border border-amber-300 shadow-2xs max-w-[100px] z-10">
                      <Barcode
                        value={p.barcode || p.sku}
                        displayValue={template.showBarcodeText}
                        height={14}
                        fontSize={6}
                      />
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={index}
                className="bg-white border border-gray-300 rounded p-3 flex flex-col justify-between text-black text-center relative overflow-hidden shrink-0 select-none shadow-sm"
                style={{
                  width: size.width,
                  height: size.height,
                }}
              >
                {/* Product Name */}
                {template.showName && (
                  <div
                    className="leading-tight font-bold text-gray-900 overflow-hidden line-clamp-2"
                    style={{ fontSize: `${parseInt(size.fontSize) - 1}px` }}
                  >
                    {p.name}
                  </div>
                )}

                {/* SKU */}
                {template.showSku && (
                  <div className="font-mono text-gray-500 font-bold tracking-wider" style={{ fontSize: `${parseInt(size.fontSize) - 3}px` }}>
                    SKU: {p.sku}
                  </div>
                )}

                {/* Barcode SVG */}
                {template.showBarcode !== false ? (
                  <div className="flex-1 flex items-center justify-center my-1 max-h-[50px] overflow-hidden">
                    <Barcode
                      value={p.barcode || p.sku}
                      displayValue={template.showBarcodeText}
                      height={template.id === 'supermarket' ? 26 : 38}
                      fontSize={9}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic my-2">
                    (Mã vạch ẩn)
                  </div>
                )}

                {/* Price Display */}
                {(template.showPrice || (template.showComparePrice && p.comparePrice)) && (
                  <div
                    className="font-black text-gray-900 border-t border-dashed border-gray-200 pt-0.5 tracking-tight flex items-center justify-center gap-1.5"
                    style={{ fontSize: `${parseInt(size.fontSize)}px` }}
                  >
                    {template.showPrice && <span>{formatPrice(p.price)}</span>}
                    {template.showComparePrice && p.comparePrice && p.comparePrice > 0 ? (
                      <span className="text-[10px] text-gray-400 line-through font-normal">
                        {formatPrice(p.comparePrice)}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
