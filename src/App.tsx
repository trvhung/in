import { useState } from 'react';
import { Product, LabelTemplate } from './types';
import { ProductList } from './components/ProductList';
import { PrintPreview } from './components/PrintPreview';
import { BarcodeScanner } from './components/BarcodeScanner';
import { PrintLayout } from './components/PrintLayout';
import { Barcode } from './components/Barcode';
import { MultiSelectModal } from './components/MultiSelectModal';
import { useMasterProducts } from './hooks/useMasterProducts';
import { 
  Printer, 
  Camera, 
  Smartphone,
  CheckCircle2,
  Trash2,
  ListRestart,
  RefreshCw,
  Database,
  Calendar,
  Layers
} from 'lucide-react';

const INITIAL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'sale-yellow',
    name: 'Tem Sale Vàng (Mica 70x40mm)',
    width: '70mm',
    height: '40mm',
    columns: 1,
    description: 'Khổ cài mica kệ hàng 70x40mm màu vàng có viền đỏ',
    showName: true,
    showPrice: true,
    showComparePrice: true,
    showSku: true,
    showBarcodeText: false,
    showBarcode: false,
  },
  {
    id: 'long-bien',
    name: 'Long biên',
    width: '75mm',
    height: '50mm',
    columns: 2,
    description: 'Cuộn khổ 2 tem/ hàng - Rộng 75mm',
    showName: true,
    showPrice: true,
    showComparePrice: true,
    showSku: true,
    showBarcodeText: true,
    showBarcode: true,
  },
  {
    id: 'single-small',
    name: 'Hà Nội (Khổ 1 tem)',
    width: '50mm',
    height: '30mm',
    columns: 1,
    description: 'Cuộn khổ 1 tem/ hàng - Rộng 50mm',
    showName: true,
    showPrice: true,
    showComparePrice: false,
    showSku: true,
    showBarcodeText: true,
    showBarcode: true,
  },
  {
    id: 'supermarket',
    name: 'Tem Siêu Thị (Khổ 3 tem)',
    width: '105mm',
    height: '22mm',
    columns: 3,
    description: 'Cuộn khổ 3 tem/ hàng - Rộng 105mm',
    showName: true,
    showPrice: true,
    showComparePrice: false,
    showSku: false,
    showBarcodeText: false,
    showBarcode: true,
  },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeProductId, setActiveProductId] = useState<string>('m1');
  const [templates, setTemplates] = useState<LabelTemplate[]>(INITIAL_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('sale-yellow');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintLayoutOpen, setIsPrintLayoutOpen] = useState(false);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  
  // Master products from Sapo
  const {
    masterProducts,
    isLoading: isMasterLoading,
    lastUpdated: sapoLastUpdated,
    syncError: sapoSyncError,
    syncSapo,
  } = useMasterProducts();

  // Sapo sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState(false);

  // Scanned action state
  const [scannedFeedback, setScannedFeedback] = useState<{
    barcode: string;
    productName?: string;
    assigned?: boolean;
    created?: boolean;
  } | null>(null);

  const handleSyncSapo = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(false);

    try {
      const result = await syncSapo();
      setSyncSuccessMessage(true);

      // Auto-clear success message
      setTimeout(() => {
        setSyncSuccessMessage(false);
      }, 3000);
    } catch (err: any) {
      console.error('Sapo sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const activeProduct = products.find((p) => p.id === activeProductId) || null;
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (activeProductId === id) {
      const remaining = products.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        setActiveProductId(remaining[0].id);
      }
    }
  };

  // Add product from live search or manual action
  const handleAddProduct = (itemToAdd: Product) => {
    const existing = products.find((p) => p.sku === itemToAdd.sku || (p.barcode && p.barcode === itemToAdd.barcode));
    
    if (existing) {
      // If already in print list, select it and make sure quantity is at least 1
      const newQty = existing.quantity === 0 ? 1 : existing.quantity + 1;
      handleUpdateProduct(existing.id, { quantity: newQty });
      setActiveProductId(existing.id);
    } else {
      // Add as new staged product
      const newStagedProduct: Product = {
        ...itemToAdd,
        quantity: 1, // Default quantity of 1 when freshly added to printable table
      };
      setProducts((prev) => [newStagedProduct, ...prev]);
      setActiveProductId(itemToAdd.id);
    }
  };

  // Batch insert selected products from multi select modal
  const handleConfirmMultiSelectProducts = (selectedMasterProducts: Product[]) => {
    setProducts((prev) => {
      const list = [...prev];
      selectedMasterProducts.forEach((masterProd) => {
        const index = list.findIndex((p) => p.id === masterProd.id);
        if (index >= 0) {
          // If already in list, ensure it has at least 1 label quantity
          if (list[index].quantity === 0) {
            list[index].quantity = 1;
          }
        } else {
          // Add newly selected with quantity 1
          list.push({
            ...masterProd,
            quantity: 1,
          });
        }
      });
      return list;
    });

    if (selectedMasterProducts.length > 0) {
      setActiveProductId(selectedMasterProducts[0].id);
    }
  };

  const handleUpdateTemplateOptions = (updates: Partial<LabelTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === activeTemplateId ? { ...t, ...updates } : t))
    );
  };

  // Barcode scanned callback
  const handleBarcodeScanned = (barcode: string) => {
    // Look for product in master or staged list
    const match = products.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    );

    if (match) {
      handleUpdateProduct(match.id, { quantity: match.quantity + 1 });
      setActiveProductId(match.id);
      setScannedFeedback({
        barcode,
        productName: match.name,
        assigned: false,
        created: false,
      });
    } else {
      // Check if it's in the Master list
      const masterMatch = masterProducts.find(
        (m) => m.barcode === barcode || m.sku.toLowerCase() === barcode.toLowerCase()
      );

      if (masterMatch) {
        handleAddProduct(masterMatch);
        setScannedFeedback({
          barcode,
          productName: masterMatch.name,
          assigned: false,
          created: false,
        });
      } else {
        // Create custom product
        const newId = 'custom-' + Date.now();
        const autoName = `Sản phẩm quét mới #${barcode.substring(0, 4)}`;
        const newProduct: Product = {
          id: newId,
          name: autoName,
          sku: 'SKU-' + barcode.substring(0, 6).toUpperCase(),
          barcode,
          quantity: 1,
          price: 0,
          comparePrice: 0,
        };
        setProducts((prev) => [newProduct, ...prev]);
        setActiveProductId(newId);
        setScannedFeedback({
          barcode,
          productName: autoName,
          assigned: false,
          created: true,
        });
      }
    }

    setIsScannerOpen(false);

    // Auto-clear feedback after 4 seconds
    setTimeout(() => {
      setScannedFeedback(null);
    }, 4500);
  };

  const printableLabels = products.flatMap((p) =>
    Array.from({ length: p.quantity }, () => p)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* 1. INTERACTIVE SCREEN WORKSPACE */}
      <div className="flex-1 pb-16 no-print">
        
        {/* Upper Brand Nav */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm md:text-base leading-tight tracking-tight">
                  Elmich - Ứng dụng in tem mã vạch
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Scanner button has been moved to search area */}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
          
          {/* Notification Feedback after scanning */}
          {scannedFeedback && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="text-xs">
                  {scannedFeedback.assigned ? (
                    <p>
                      Đã gán thành công mã vạch <strong className="text-black">{scannedFeedback.barcode}</strong> cho sản phẩm{' '}
                      <strong>"{scannedFeedback.productName}"</strong>!
                    </p>
                  ) : scannedFeedback.created ? (
                    <p>
                      Không tìm thấy sản phẩm! Đã tự tạo sản phẩm mới{' '}
                      <strong>"{scannedFeedback.productName}"</strong> với mã vạch{' '}
                      <strong className="text-black">{scannedFeedback.barcode}</strong>.
                    </p>
                  ) : (
                    <p>
                      Đã tìm thấy sản phẩm <strong>"{scannedFeedback.productName}"</strong>!{' '}
                      Tự động tăng số lượng in thêm <strong className="text-black">1 tem</strong>.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setScannedFeedback(null)}
                className="text-green-500 hover:text-green-700 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          )}

          {/* Sapo Integration Sync Panel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-300">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            
            <div className="flex items-start gap-3.5 text-left">
              {/* Sapo Brand Circle Icon */}
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 mt-0.5">
                <Database className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="text-gray-400">Lần cập nhật cuối:</span>
                  <strong className="text-gray-700 font-semibold">{sapoLastUpdated}</strong>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-400">Danh mục Sapo:</span>
                  <strong className="text-gray-700 font-semibold">{masterProducts.length} sản phẩm</strong>
                </div>

                {/* Update button and success feedback aligned to the left */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSyncSapo}
                    disabled={isSyncing}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                      isSyncing
                        ? 'bg-blue-50 text-blue-400 border border-blue-100 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Đang cập nhật...' : 'Cập nhật sản phẩm Sapo'}
                  </button>

                  {syncSuccessMessage && (
                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Đồng bộ thành công!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID LAYOUT (Matches sample image structure) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Hand: Product details and list (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <ProductList
                products={products}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddProduct={handleAddProduct}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenMultiSelect={() => setIsMultiSelectOpen(true)}
                activeProductId={activeProductId}
                onSelectProduct={setActiveProductId}
                masterProducts={masterProducts}
              />
            </div>

            {/* Right Hand: Barcode label templates & preview cards (4 cols) */}
            <div className="lg:col-span-4 sticky top-24">
              <PrintPreview
                products={products}
                activeProduct={activeProduct}
                activeTemplate={activeTemplate}
                onChangeTemplate={setActiveTemplateId}
                templates={templates}
                onUpdateTemplateOptions={handleUpdateTemplateOptions}
                onPrint={() => window.print()}
              />
            </div>

          </div>
        </main>
      </div>

      {/* 2. LIVE CAMERA BARCODE SCANNER MODAL */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* 3. PHYSICAL PRINT BATCH PREVIEW MODAL */}
      {isPrintLayoutOpen && (
        <PrintLayout
          products={products}
          template={activeTemplate}
          onClose={() => setIsPrintLayoutOpen(false)}
        />
      )}

      {/* 4. MULTI SELECT PRODUCT CATALOG MODAL */}
      {isMultiSelectOpen && (
        <MultiSelectModal
          onClose={() => setIsMultiSelectOpen(false)}
          onAddSelectedProducts={handleConfirmMultiSelectProducts}
          alreadyStagedProductIds={products.map((p) => p.id)}
          masterProducts={masterProducts}
        />
      )}

      {/* 5. TRUE PHYSICAL PRINT SHEET (Visible ONLY when system is printing Ctrl+P) */}
      <div className="hidden print-only bg-white text-black p-0 w-full">
        <div
          className="flex flex-wrap gap-1 bg-white"
          style={{
            justifyContent: 'flex-start',
          }}
        >
          {printableLabels.map((p, index) => {
            const sizeWidth = activeTemplate.id === 'sale-yellow'
              ? '70mm'
              : activeTemplate.id === 'single-small'
              ? '50mm'
              : activeTemplate.id === 'supermarket'
              ? '35mm'
              : '37.5mm';
            const sizeHeight = activeTemplate.id === 'sale-yellow'
              ? '40mm'
              : activeTemplate.id === 'single-small'
              ? '30mm'
              : activeTemplate.id === 'supermarket'
              ? '22mm'
              : '50mm';

            if (activeTemplate.id === 'sale-yellow') {
              // Auto-calculate discount: nếu có price và comparePrice > price
              const discountPercent = p.price > 0 && p.comparePrice && p.comparePrice > p.price
                ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
                : 50;
              // Nếu không có price thì dùng comparePrice làm giá chính
              const displayPrice = p.price > 0 ? p.price : (p.comparePrice || 0);
              const hasStrikeThrough = p.price > 0 && p.comparePrice && p.comparePrice > p.price;

              return (
                <div
                  key={index}
                  className="bg-[#FFEE00] flex flex-col justify-between text-black transition-all overflow-hidden relative select-none text-left"
                  style={{
                    width: sizeWidth,
                    height: sizeHeight,
                    pageBreakInside: 'avoid',
                  }}
                >
                  {/* SALE box sát góc trên-trái */}
                  <div className="absolute top-0 left-0 bg-[#E30613] text-white flex flex-col items-center justify-center font-bold leading-none w-[56px] h-[56px] select-none">
                    <div className="text-[9px] tracking-widest uppercase font-black">SALE</div>
                    <div className="text-[20px] font-black mt-0.5 leading-none tracking-tighter">
                      {discountPercent}%
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col pt-1.5 pr-2 pb-0.5 pl-[60px]">
                    {/* Product Name - top */}
                    {activeTemplate.showName && (
                      <div className="text-[10px] font-medium text-slate-900 leading-tight line-clamp-2 uppercase tracking-tight">
                        {p.name}
                      </div>
                    )}

                    {/* Spacer pushes SKU/price to middle-bottom */}
                    <div className="flex-1" />

                    {/* SKU + Compare Price - sát trên giá */}
                    <div className="flex justify-between items-end">
                      {activeTemplate.showSku && (
                        <div className="text-[14px] font-medium text-slate-700 tracking-wide font-sans">
                          {p.sku}
                        </div>
                      )}
                      {activeTemplate.showComparePrice && hasStrikeThrough && (
                        <span className="text-[15px] text-slate-600 line-through font-medium tracking-tight">
                          {p.comparePrice!.toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>

                    {/* Big Price - bottom */}
                    <div className="flex items-baseline">
                      {activeTemplate.showPrice && (
                        <div className="flex items-baseline gap-1">
                          <span className="text-[53px] font-bold text-[#E30613] leading-none tracking-tight">
                            {displayPrice.toLocaleString('vi-VN')}
                          </span>
                          <span className="text-[13px] font-semibold text-[#E30613] tracking-wider">VND</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={index}
                className="bg-white border border-gray-400 p-2 flex flex-col justify-between text-center relative overflow-hidden select-none"
                style={{
                  width: sizeWidth,
                  height: sizeHeight,
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Product Name */}
                {activeTemplate.showName && (
                  <div className="leading-tight font-bold text-gray-900 text-[10px] overflow-hidden line-clamp-2 uppercase">
                    {p.name}
                  </div>
                )}

                {/* SKU */}
                {activeTemplate.showSku && (
                  <div className="font-mono text-gray-600 font-bold text-[8px] tracking-wider mt-0.5">
                    SKU: {p.sku}
                  </div>
                )}

                {/* Barcode SVG */}
                {activeTemplate.showBarcode !== false ? (
                  <div className="flex-1 flex items-center justify-center my-0.5">
                    <Barcode
                      value={p.barcode || p.sku}
                      displayValue={activeTemplate.showBarcodeText}
                      height={activeTemplate.id === 'supermarket' ? 22 : 32}
                      fontSize={8}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[8px] text-gray-400 italic">
                    (Mã vạch ẩn)
                  </div>
                )}

                {/* Price Display */}
                {(activeTemplate.showPrice || (activeTemplate.showComparePrice && p.comparePrice)) && (
                  <div className="font-black text-gray-900 text-[10px] border-t border-dashed border-gray-300 pt-0.5 mt-0.5 flex items-center justify-center gap-1">
                    {activeTemplate.showPrice && (
                      <span>{p.price === 0 ? '0đ' : p.price.toLocaleString('vi-VN') + 'đ'}</span>
                    )}
                    {activeTemplate.showComparePrice && p.comparePrice && p.comparePrice > 0 ? (
                      <span className="text-[8px] text-gray-400 line-through font-normal">
                        {p.comparePrice.toLocaleString('vi-VN')}đ
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer information */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>Barcode Label Studio & Scanner © 2026</span>
          <div className="flex items-center gap-1 text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            <span>Mở ứng dụng trên điện thoại di động để sử dụng tính năng quét camera sau tốt nhất!</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
