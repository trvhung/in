import { LabelTemplate, Product } from '../types';
import { Barcode } from './Barcode';
import { Printer, Settings, Check, LayoutGrid, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { useState } from 'react';

interface PrintPreviewProps {
  products: Product[];
  activeProduct: Product | null;
  activeTemplate: LabelTemplate;
  onChangeTemplate: (templateId: string) => void;
  templates: LabelTemplate[];
  onUpdateTemplateOptions: (updates: Partial<LabelTemplate>) => void;
  onPrint: () => void;
}

export function PrintPreview({
  products,
  activeProduct,
  activeTemplate,
  onChangeTemplate,
  templates,
  onUpdateTemplateOptions,
  onPrint,
}: PrintPreviewProps) {
  const [showSettings, setShowSettings] = useState(false);

  // Compute total number of labels to print
  const totalLabels = products.reduce((acc, p) => acc + p.quantity, 0);

  // Format price helper
  const formatPrice = (price: number) => {
    if (price === 0) return '0đ';
    return price.toLocaleString('vi-VN') + 'đ';
  };

  // Calculate discount percentage automatically based on price
  const getDiscountPercent = (product: Product) => {
    if (product.price > 0 && product.comparePrice && product.comparePrice > product.price) {
      return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
    }
    return 50; // default template percentage if no comparison exists
  };

  // Safe name display helper
  const truncateName = (name: string, maxLen = 45) => {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen) + '...';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full flex flex-col justify-between" id="barcode-preview-sidebar">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
            Mẫu tem mã vạch
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-all ${
              showSettings
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500'
            }`}
            title="Cấu hình tem"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Template Select Dropdown */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Khổ giấy / Mẫu tem</label>
          <select
            value={activeTemplate.id}
            onChange={(e) => onChangeTemplate(e.target.value)}
            className="w-full text-sm bg-white border border-gray-200 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 shadow-sm"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic settings panel if toggled */}
        {showSettings && (
          <div className="mb-5 p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2.5 text-xs text-gray-600 animate-fade-in">
            <div className="font-semibold text-gray-700 text-xs mb-1 border-b border-gray-200 pb-1">Tùy chỉnh nội dung hiển thị</div>
            
            <button
              onClick={() => onUpdateTemplateOptions({ showName: !activeTemplate.showName })}
              className="flex items-center justify-between py-0.5 hover:text-gray-900"
            >
              <span>Hiện tên sản phẩm</span>
              {activeTemplate.showName ? (
                <ToggleRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            <button
              onClick={() => onUpdateTemplateOptions({ showSku: !activeTemplate.showSku })}
              className="flex items-center justify-between py-0.5 hover:text-gray-900"
            >
              <span>Hiện mã SKU sản phẩm</span>
              {activeTemplate.showSku ? (
                <ToggleRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            <button
              onClick={() => onUpdateTemplateOptions({ showBarcodeText: !activeTemplate.showBarcodeText })}
              className="flex items-center justify-between py-0.5 hover:text-gray-900"
            >
              <span>Hiện chữ số dưới mã vạch</span>
              {activeTemplate.showBarcodeText ? (
                <ToggleRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            <button
              onClick={() => onUpdateTemplateOptions({ showPrice: !activeTemplate.showPrice })}
              className="flex items-center justify-between py-0.5 hover:text-gray-900"
            >
              <span>Hiện giá sản phẩm</span>
              {activeTemplate.showPrice ? (
                <ToggleRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            <button
              onClick={() => onUpdateTemplateOptions({ showComparePrice: !activeTemplate.showComparePrice })}
              className="flex items-center justify-between py-0.5 hover:text-gray-900"
            >
              <span>Hiện giá niêm yết (gạch ngang)</span>
              {activeTemplate.showComparePrice ? (
                <ToggleRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            <button
              onClick={() => onUpdateTemplateOptions({ showBarcode: activeTemplate.showBarcode !== false ? false : true })}
              className="flex items-center justify-between py-0.5 hover:text-gray-900"
            >
              <span>Hiện mã vạch (Barcode)</span>
              {activeTemplate.showBarcode !== false ? (
                <ToggleRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Color picker for sale templates */}
            {activeTemplate.id.startsWith('sale-') && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-xs text-gray-600">Màu nền</span>
                <input
                  type="color"
                  value={activeTemplate.bgColor || '#FFFFFF'}
                  onChange={(e) => onUpdateTemplateOptions({ bgColor: e.target.value })}
                  className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0"
                />
              </div>
            )}
          </div>
        )}

        {/* Single Label Realistic Preview Stage */}
        <div className={`rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden ${
          (activeTemplate.id.startsWith('sale-') || activeTemplate.id === 'list-price')
            ? 'bg-transparent p-2'
            : 'bg-gray-100 border border-gray-200 p-5'
        }`}
        style={(activeTemplate.id.startsWith('sale-') || activeTemplate.id === 'list-price') ? {} : { minHeight: '220px' }}
        >
          {activeProduct ? (
            activeTemplate.id.startsWith('sale-') ? (
              /* Sale Preview - exact print size */
              <div
                className="text-black transition-all flex flex-col justify-between relative select-none text-left border border-gray-300"
                style={{
                  width: activeTemplate.width,
                  height: activeTemplate.height,
                  backgroundColor: activeTemplate.bgColor || '#FFFFFF',
                }}
              >
                {/* SALE box sát góc trên-trái */}
                <div className="absolute top-0 left-0 bg-[#E30613] text-white flex flex-col items-center justify-center font-bold leading-none w-[56px] h-[56px] select-none">
                  <div className="text-[9px] tracking-widest uppercase font-black">SALE</div>
                  <div className="text-[20px] font-black mt-0.5 leading-none tracking-tighter">
                    {getDiscountPercent(activeProduct)}%
                  </div>
                </div>

                {/* Nội dung chính */}
                <div className="flex-1 flex flex-col pt-1.5 pb-0.5">
                  {/* Product Name - top, clears SALE box */}
                  {activeTemplate.showName && (
                    <div className="text-[10px] font-medium text-slate-900 leading-tight line-clamp-2 uppercase tracking-tight pl-[60px] pr-1">
                      {activeProduct.name}
                    </div>
                  )}

                  {/* Spacer pushes SKU/price to middle-bottom */}
                  <div className="flex-1" />

                  {/* SKU + Giá niêm yết - sát trên giá, full width */}
                  <div className="flex justify-between items-end px-1">
                    {activeTemplate.showSku && (
                      <div className="text-[14px] font-medium text-slate-700 tracking-wide font-sans">
                        {activeProduct.sku}
                      </div>
                    )}
                    {activeTemplate.showComparePrice && activeProduct.price > 0 && activeProduct.comparePrice && activeProduct.comparePrice > activeProduct.price && (
                      <span className="text-[15px] text-slate-600 line-through font-medium tracking-tight">
                        {activeProduct.comparePrice.toLocaleString('vi-VN')}
                      </span>
                    )}
                    {!activeTemplate.showSku && <div />}
                    {!(activeTemplate.showComparePrice && activeProduct.price > 0 && activeProduct.comparePrice && activeProduct.comparePrice > activeProduct.price) && <div />}
                  </div>

                  {/* Big Price - bottom, centered, full width */}
                  <div className="flex justify-center items-baseline">
                    {activeTemplate.showPrice && (
                      <>
                        <span className="text-[53px] font-semibold text-[#E30613] leading-none tracking-tighter">
                          {(activeProduct.price > 0 ? activeProduct.price : (activeProduct.comparePrice || 0)).toLocaleString('vi-VN')}
                        </span>
                        <span className="text-[10px] font-semibold text-[#E30613] ml-0.5">VND</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Target Indicator badge */}
                <div className="absolute top-0.5 right-0.5 px-1 bg-blue-600 text-[8px] text-white rounded uppercase font-bold pointer-events-none z-20">
                  Đang xem
                </div>
              </div>
            ) : activeTemplate.id === 'list-price' ? (
              /* Tem Giá Niêm Yết Preview */
              <div
                className="bg-white border border-gray-300 flex flex-col items-center justify-between text-center relative select-none p-1"
                style={{
                  width: activeTemplate.width,
                  height: activeTemplate.height,
                }}
              >
                {/* Name + Price row */}
                <div className="flex justify-between items-center w-full gap-1">
                  {activeTemplate.showName && (
                    <div className="text-[6px] font-semibold text-gray-900 leading-tight line-clamp-1 uppercase text-left flex-1">
                      {activeProduct.name}
                    </div>
                  )}
                  {activeTemplate.showPrice && (
                    <span className="text-[7px] font-bold text-gray-900 shrink-0">
                      {activeProduct.price === 0 ? '0đ' : activeProduct.price.toLocaleString('vi-VN') + 'đ'}
                    </span>
                  )}
                </div>

                {/* Big Barcode - center */}
                {activeTemplate.showBarcode !== false && (
                  <div className="flex-1 flex items-center justify-center w-full">
                    <Barcode
                      value={activeProduct.barcode || activeProduct.sku}
                      displayValue={activeTemplate.showBarcodeText}
                      height={22}
                      fontSize={5}
                    />
                  </div>
                )}

                {/* Giá niêm yết - bottom */}
                {activeTemplate.showComparePrice && activeProduct.comparePrice && activeProduct.comparePrice > 0 && (
                  <div className="text-[6px] text-gray-500 w-full text-right">
                    Giá NY: {activeProduct.comparePrice.toLocaleString('vi-VN')}đ
                  </div>
                )}

                {/* Target Indicator badge */}
                <div className="absolute top-0.5 right-0.5 px-1 bg-blue-600 text-[6px] text-white rounded uppercase font-bold pointer-events-none">
                  Đang xem
                </div>
              </div>
            ) : (
              /* Standard Preview label */
              <div
                className="bg-white border border-gray-300 rounded shadow-md p-4 flex flex-col justify-between text-black transition-all overflow-hidden relative"
                style={{
                  width: '260px',
                  minHeight: '160px',
                }}
              >
                {/* Product Name Header */}
                {activeTemplate.showName && (
                  <div className="text-[12px] leading-tight font-semibold text-gray-900 text-center tracking-tight truncate-2-lines min-h-[32px]">
                    {activeProduct.name}
                  </div>
                )}

                {/* SKU display */}
                {activeTemplate.showSku && (
                  <div className="text-[10px] text-gray-500 font-mono text-center mt-0.5">
                    SKU: {activeProduct.sku}
                  </div>
                )}

                {/* Barcode representation */}
                {activeTemplate.showBarcode !== false ? (
                  <div className="my-2.5 flex-1 flex items-center justify-center">
                    <Barcode
                      value={activeProduct.barcode || activeProduct.sku}
                      displayValue={activeTemplate.showBarcodeText}
                      height={activeTemplate.id === 'single-small' ? 32 : 45}
                      fontSize={10}
                    />
                  </div>
                ) : (
                  <div className="my-4 flex-1 flex items-center justify-center text-xs text-gray-400 italic">
                    (Mã vạch ẩn)
                  </div>
                )}

                {/* Price Tag */}
                {(activeTemplate.showPrice || (activeTemplate.showComparePrice && activeProduct.comparePrice)) && (
                  <div className="text-center font-bold text-gray-900 tracking-tight mt-1 border-t border-dashed border-gray-100 pt-1 flex items-center justify-center gap-2">
                    {activeTemplate.showPrice && (
                      <span className="text-[14px]">
                        {formatPrice(activeProduct.price)}
                      </span>
                    )}
                    {activeTemplate.showComparePrice && activeProduct.comparePrice && activeProduct.comparePrice > 0 && (
                      <span className="text-[11px] text-gray-400 line-through font-normal">
                        {formatPrice(activeProduct.comparePrice)}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Target Indicator badge */}
                <div className="absolute top-1 right-1 px-1 bg-blue-500 text-[8px] text-white rounded uppercase font-bold pointer-events-none">
                  Đang xem
                </div>
              </div>
            )
          ) : (
            <div className="text-center p-6 text-gray-400 text-xs flex flex-col items-center gap-2">
              <Info className="w-8 h-8 text-gray-300" />
              <span>Nhấn chọn sản phẩm bên trái để xem trước mẫu tem</span>
            </div>
          )}
        </div>

        {/* Technical Description info below the preview */}
        <p className="mt-3.5 text-xs text-gray-500 text-center font-medium bg-gray-50 py-2 px-3 rounded-lg border border-gray-100">
          {activeTemplate.description}
        </p>
      </div>

      {/* Statistics and Print Action */}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="flex justify-between items-center text-xs mb-4">
          <span className="text-gray-500">Tổng số tem chuẩn bị in:</span>
          <span className="font-bold text-gray-800 text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {totalLabels} tem
          </span>
        </div>

        <button
          onClick={onPrint}
          disabled={totalLabels === 0}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
            totalLabels > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Printer className="w-4 h-4" />
          In {totalLabels} tem mã vạch
        </button>

        {totalLabels === 0 && (
          <p className="text-[11px] text-amber-600 mt-2 text-center flex items-center justify-center gap-1">
            ⚠️ Hãy tăng "SL tem" của các sản phẩm muốn in!
          </p>
        )}
      </div>
    </div>
  );
}
