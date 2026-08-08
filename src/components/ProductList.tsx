import { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { Product } from '../types';
import { Search, Upload, Download, HelpCircle, Layers, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductListProps {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAddProduct: (product: Product) => void;
  onAddProducts: (products: Product[]) => void;
  onOpenMultiSelect: () => void;
  masterProducts: Product[];
}

export function ProductList({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  onAddProducts,
  onOpenMultiSelect,
  masterProducts,
}: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Defer search query to avoid blocking input during typing
  const deferredQuery = useDeferredValue(searchQuery);

  // Filter master catalog items — optimized with useMemo + deferred query
  const liveSearchResults = useMemo(() => {
    const query = deferredQuery.toLowerCase().trim();
    const MAX_RESULTS = 100;

    const results = masterProducts.filter((p) => {
      // Hide if already in the selected products list
      const isAlreadySelected = products.some((sel) => sel.sku === p.sku);
      if (isAlreadySelected) return false;

      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
      );
    });

    return results.slice(0, MAX_RESULTS);
  }, [masterProducts, products, deferredQuery]);

  const handleSelectDropdownItem = (item: Product) => {
    onAddProduct(item);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Helper to format thousands separator for prices in the inputs
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === 0) return '';
    return num.toLocaleString('vi-VN');
  };

  const parseNumber = (str: string) => {
    const clean = str.replace(/\D/g, '');
    return parseInt(clean) || 0;
  };

  // ── Excel Upload ──────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelUpload = (e: any) => {
    const file = e.target.files?.[0] as File | undefined;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find header row (look for "sku" in first row)
        const headerIdx = rows.findIndex((r: any[]) =>
          r.some((cell: any) => String(cell || '').toLowerCase().includes('sku'))
        );
        if (headerIdx < 0) {
          alert('File Excel không đúng định dạng. Vui lòng tải file mẫu.');
          return;
        }

        const newProducts: Product[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          const sku = String(row[0] || '').trim();
          const priceRaw = String(row[1] || '0').trim();

          if (!sku) continue;

          const excelPrice = parseNumber(priceRaw);

          // Look up product from Sapo master by SKU
          const masterMatch = masterProducts.find(
            (m) => m.sku.toLowerCase() === sku.toLowerCase()
          );

          if (masterMatch) {
            newProducts.push({
              ...masterMatch,
              quantity: 1,
              price: excelPrice || masterMatch.price,
            });
          } else {
            // SKU not found in master — skip (can't update without variant ID)
            console.warn(`SKU "${sku}" không tìm thấy trong danh mục Sapo`);
          }
        }

        if (newProducts.length > 0) {
          onAddProducts(newProducts);
        } else {
          alert('Không tìm thấy dữ liệu sản phẩm trong file.');
        }
      } catch (err: any) {
        alert('Lỗi đọc file Excel: ' + (err.message || 'File không hợp lệ'));
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input để có thể chọn lại cùng file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadSample = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      ['SKU', 'Giá bán'],
      ['SP001', '150000'],
      ['SP002', '85000'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    // Set column widths
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách cập nhật giá');
    XLSX.writeFile(wb, 'mau-upload-cap-nhat-gia.xlsx');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col h-full relative">
      
      {/* 1. Header and search layout */}
      <div className="mb-5">
        <h2 className="font-bold text-gray-800 text-base mb-3">Sản phẩm</h2>

        {/* Input and Select actions - MATCHES screenshot 2 & 3 */}
        <div className="flex gap-2.5 relative" ref={dropdownRef}>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã SKU..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 shadow-sm font-medium placeholder-gray-400"
            />

            {/* LIVE SEARCH DROPDOWN - MATCHES screenshot 2 */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[320px] overflow-y-auto divide-y divide-gray-100 animate-fade-in">
                {liveSearchResults.length > 0 ? (
                  liveSearchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectDropdownItem(p)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 font-bold overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-lg">📦</span>
                          )}
                        </div>

                        {/* Title, SKU, Barcode */}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 text-xs md:text-sm truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-2">
                            <span>SKU: <strong className="text-gray-700">{p.sku}</strong></span>
                            {p.barcode && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>Mã vạch: <strong className="text-blue-600">{p.barcode}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side Price */}
                      <div className="text-xs md:text-sm font-semibold text-gray-700 shrink-0 pl-3">
                        {p.price === 0 ? '0đ' : p.price.toLocaleString('vi-VN') + 'đ'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 text-center text-xs text-gray-400">
                    Không tìm thấy sản phẩm "{searchQuery}" trong danh mục.
                    <button
                      onClick={() => {
                        // Let user add custom product with search title
                        const autoSku = 'SKU-' + Math.random().toString(36).substr(2, 5).toUpperCase();
                        onAddProduct({
                          id: 'custom-' + Date.now(),
                          name: searchQuery,
                          sku: autoSku,
                          barcode: '',
                          quantity: 1,
                          price: 0,
                          comparePrice: 0,
                        });
                        setSearchQuery('');
                      }}
                      className="block mx-auto mt-2 text-blue-600 font-bold hover:underline"
                    >
                      + Thêm sản phẩm này làm sản phẩm tùy chỉnh
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chọn nhiều button - MATCHES screenshot 2 */}
          <button
            onClick={onOpenMultiSelect}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <Layers className="w-4.5 h-4.5 text-blue-600" />
            Chọn nhiều
          </button>

          {/* Upload Excel button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
            id="excel-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold active:scale-98 transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <Upload className="w-4.5 h-4.5" />
            Upload Excel
          </button>

          {/* Tải file mẫu */}
          <button
            onClick={handleDownloadSample}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-98 transition-all flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
            title="Tải file Excel mẫu"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Selected/Staged Print Table Headers */}
      <div className="grid grid-cols-12 px-4 py-3 text-xs font-bold text-gray-700 bg-gray-50 rounded-t-xl border-b border-gray-200">
        <div className="col-span-7 flex items-center">
          Sản phẩm ({products.length})
        </div>
        <div className="col-span-4 text-center">Giá bán</div>
        <div className="col-span-1 text-right"></div>
      </div>

      {/* 3. Table Rows / Selected Products List - MATCHES screenshot 1 */}
      <div className="flex-1 overflow-y-auto max-h-[500px] border border-gray-200 border-t-0 rounded-b-xl divide-y divide-gray-100 bg-white">
        {products.length > 0 ? (
          products.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-12 items-center px-4 py-3 text-sm transition-all hover:bg-slate-50/70"
            >
              {/* Product avatar, metadata, name */}
              <div className="col-span-7 flex items-center gap-3 pr-2">
                <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 font-bold overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-lg">📦</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-xs md:text-[13px] leading-tight line-clamp-2">
                    {p.name}
                  </div>
                  <div className="text-[10px] md:text-xs text-gray-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>SKU: <strong className="text-gray-700">{p.sku}</strong></span>
                    <span className="text-gray-300">|</span>
                    <span>Mã vạch: <strong className={p.barcode ? 'text-blue-600' : 'text-gray-400'}>{p.barcode || '---'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Giá Bán Input */}
              <div className="col-span-4 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center max-w-[130px] mx-auto">
                  <input
                    type="text"
                    value={formatNumber(p.price)}
                    placeholder="0"
                    onChange={(e) => {
                      const num = parseNumber(e.target.value);
                      onUpdateProduct(p.id, { price: num });
                    }}
                    className="w-full text-right pr-4 pl-1 border border-gray-200 rounded-lg py-1 text-xs md:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="absolute right-1.5 text-[10px] md:text-xs text-gray-400">đ</span>
                </div>
              </div>

              {/* Delete button Column */}
              <div className="col-span-1 text-right flex justify-end" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onDeleteProduct(p.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Xóa dòng"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-gray-400 text-xs flex flex-col items-center gap-2 bg-slate-50/50">
            <span className="text-xl">📋</span>
            <span className="font-medium">Chưa chọn sản phẩm nào để cập nhật giá</span>
            <p className="text-[11px] text-gray-400 max-w-sm mt-1">
              Hãy nhập tìm kiếm sản phẩm phía trên hoặc nhấn <strong className="text-blue-600 font-bold">Chọn nhiều</strong> để đưa các mặt hàng vào danh sách cập nhật giá.
            </p>
          </div>
        )}
      </div>

      {/* Info Help Banner */}
      <div className="mt-3.5 text-[11px] text-gray-400 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-gray-300" />
        <span>Gợi ý: Upload file Excel (SKU, Giá bán) để thêm nhanh sản phẩm vào danh sách cập nhật giá.</span>
      </div>
    </div>
  );
}
