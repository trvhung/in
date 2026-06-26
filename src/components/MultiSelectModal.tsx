import { useState, useMemo, useDeferredValue } from 'react';
import { Product } from '../types';
import { Search, X, CheckSquare, Square, Filter, ChevronDown } from 'lucide-react';

interface MultiSelectModalProps {
  onClose: () => void;
  onAddSelectedProducts: (selected: Product[]) => void;
  alreadyStagedProductIds: string[];
  masterProducts: Product[];
}

export function MultiSelectModal({
  onClose,
  onAddSelectedProducts,
  alreadyStagedProductIds,
  masterProducts,
}: MultiSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedIds, setSelectedIds] = useState<string[]>(alreadyStagedProductIds);
  const [filterWithBarcodeOnly, setFilterWithBarcodeOnly] = useState(false);

  // Defer search query for smooth typing with 3828 products
  const deferredQuery = useDeferredValue(searchQuery);

  // Derive available categories
  const categories = useMemo(() => {
    const list = new Set(masterProducts.map((p) => p.category).filter(Boolean));
    return ['Tất cả', ...Array.from(list)];
  }, [masterProducts]);

  // Filter master products based on user query & filters — limited to 200 for perf
  const filteredProducts = useMemo(() => {
    const MAX_RESULTS = 200;
    const query = deferredQuery.toLowerCase().trim();

    const results = masterProducts.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const skuMatch = p.sku.toLowerCase().includes(query);
      const barcodeMatch = p.barcode.toLowerCase().includes(query);
      const matchesSearch = nameMatch || skuMatch || barcodeMatch;

      const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      const matchesBarcode = !filterWithBarcodeOnly || !!p.barcode;

      return matchesSearch && matchesCategory && matchesBarcode;
    });

    return results.slice(0, MAX_RESULTS);
  }, [masterProducts, deferredQuery, selectedCategory, filterWithBarcodeOnly]);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((p) => p.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const newSelections = [...selectedIds];
      visibleIds.forEach((id) => {
        if (!newSelections.includes(id)) {
          newSelections.push(id);
        }
      });
      setSelectedIds(newSelections);
    }
  };

  const handleConfirmAdd = () => {
    // Map selectedIds back to the actual masterProducts
    const chosen = masterProducts.filter((p) => selectedIds.includes(p.id));
    onAddSelectedProducts(chosen);
    onClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-lg">Chọn nhiều sản phẩm</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row gap-3">
          {/* Live search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl py-2 px-3.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 cursor-pointer"
            >
              <option disabled>Loại sản phẩm</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Tất cả' ? 'Tất cả loại' : cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Has Barcode Checkbox Filter */}
          <button
            onClick={() => setFilterWithBarcodeOnly(!filterWithBarcodeOnly)}
            className={`px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterWithBarcodeOnly
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Có mã vạch
          </button>
        </div>

        {/* List of Products inside Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[300px]">
          
          {/* Table list header with batch Visibles Checkbox */}
          <div className="grid grid-cols-12 items-center bg-gray-50 px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-1 flex items-center">
              <button
                onClick={handleToggleSelectAllVisible}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Chọn tất cả hiển thị"
              >
                {filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.includes(p.id)) ? (
                  <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
              </button>
            </div>
            <div className="col-span-8">Sản phẩm ({filteredProducts.length})</div>
            <div className="col-span-3 text-right">Giá bán</div>
          </div>

          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const isChecked = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleToggleSelect(p.id)}
                  className={`grid grid-cols-12 items-center px-6 py-3 text-sm transition-all cursor-pointer hover:bg-slate-50 ${
                    isChecked ? 'bg-blue-50/20' : ''
                  }`}
                >
                  {/* Checkbox col */}
                  <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleSelect(p.id)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                      ) : (
                        <Square className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>

                  {/* Thumbnail & Meta col */}
                  <div className="col-span-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 font-bold overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-lg">📦</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 text-xs md:text-sm truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-500 font-mono mt-0.5 flex flex-wrap items-center gap-2">
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

                  {/* Price col */}
                  <div className="col-span-3 text-right font-semibold text-gray-800">
                    {p.price === 0 ? '0đ' : p.price.toLocaleString('vi-VN') + 'đ'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-gray-400 text-xs flex flex-col items-center gap-2">
              <span>Không tìm thấy sản phẩm phù hợp</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            <strong className="text-blue-600 font-bold">{selectedIds.length}</strong> / 500 sản phẩm được chọn
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmAdd}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-blue-500/15 cursor-pointer"
            >
              Thêm sản phẩm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
