import { useState } from 'react';
import { Product } from '../types';
import { ProductList } from './ProductList';
import { MultiSelectModal } from './MultiSelectModal';
import { useMasterProducts } from '../hooks/useMasterProducts';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Send,
} from 'lucide-react';

export function PriceUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Master products from Sapo
  const {
    masterProducts,
    lastUpdated: sapoLastUpdated,
    syncSapo,
  } = useMasterProducts();

  // Sapo sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState(false);

  const handleSyncSapo = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(false);
    try {
      await syncSapo();
      setSyncSuccessMessage(true);
      setTimeout(() => setSyncSuccessMessage(false), 3000);
    } catch (err: any) {
      console.error('Sapo sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Add single product from live search
  const handleAddProduct = (itemToAdd: Product) => {
    const existing = products.find((p) => p.sku === itemToAdd.sku);
    if (existing) {
      handleUpdateProduct(existing.id, { quantity: existing.quantity + 1 });
    } else {
      setProducts((prev) => [{ ...itemToAdd, quantity: 1 }, ...prev]);
    }
  };

  // Batch add products (from Excel upload)
  const handleAddProducts = (itemsToAdd: Product[]) => {
    setProducts((prev) => {
      const list = [...prev];
      for (const item of itemsToAdd) {
        const existing = list.find((p) => p.sku === item.sku);
        if (existing) {
          existing.quantity = existing.quantity + 1;
        } else {
          list.push({ ...item, quantity: 1 });
        }
      }
      return list;
    });
  };

  // Batch insert selected products from MultiSelectModal
  const handleConfirmMultiSelectProducts = (selectedMasterProducts: Product[]) => {
    setProducts((prev) => {
      const list = [...prev];
      selectedMasterProducts.forEach((masterProd) => {
        const index = list.findIndex((p) => p.id === masterProd.id);
        if (index >= 0) {
          if (list[index].quantity === 0) {
            list[index].quantity = 1;
          }
        } else {
          list.push({ ...masterProd, quantity: 1 });
        }
      });
      return list;
    });
  };

  // Extract variant ID from product.id (format: "sapo-{productId}-{variantId}")
  const extractVariantId = (product: Product): number | null => {
    const parts = product.id.split('-');
    if (parts.length >= 3 && parts[0] === 'sapo') {
      return parseInt(parts[parts.length - 1]);
    }
    return null;
  };

  // Call API to update prices on Sapo
  const handleUpdatePrices = async () => {
    const validProducts = products.filter((p) => {
      const variantId = extractVariantId(p);
      return variantId !== null && p.price > 0;
    });

    if (validProducts.length === 0) {
      alert('Không có sản phẩm hợp lệ để cập nhật. Vui lòng chọn sản phẩm từ danh mục Sapo và nhập giá > 0.');
      return;
    }

    if (!confirm(`Xác nhận cập nhật giá cho ${validProducts.length} sản phẩm lên Sapo?`)) return;

    setIsUpdating(true);
    setUpdateResult(null);

    try {
      const updates = validProducts.map((p) => ({
        variantId: extractVariantId(p)!,
        price: p.price,
      }));

      const res = await fetch('/api/sapo/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setUpdateResult({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });
    } catch (err: any) {
      setUpdateResult({
        success: 0,
        failed: validProducts.length,
        errors: [err.message || 'Lỗi không xác định'],
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Count products that can be updated (have valid variant ID from Sapo)
  const updatableCount = products.filter((p) => {
    const variantId = extractVariantId(p);
    return variantId !== null && p.price > 0;
  }).length;

  const nonUpdatableCount = products.length - updatableCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm md:text-base leading-tight tracking-tight">
                Elmich - Cập nhật giá Sapo
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">

        {/* Sapo Sync Panel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          <div className="flex items-start gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 mt-0.5">
              <Database className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <span className="text-gray-400">Lần đồng bộ cuối:</span>
                <strong className="text-gray-700 font-semibold">{sapoLastUpdated}</strong>
                <span className="text-gray-300">|</span>
                <span className="text-gray-400">Danh mục Sapo:</span>
                <strong className="text-gray-700 font-semibold">{masterProducts.length} sản phẩm</strong>
              </div>

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
                  {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ sản phẩm Sapo'}
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

        {/* ProductList */}
        <ProductList
          products={products}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onAddProduct={handleAddProduct}
          onAddProducts={handleAddProducts}
          onOpenMultiSelect={() => setIsMultiSelectOpen(true)}
          masterProducts={masterProducts}
        />

        {/* Update button + status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-500">
              {products.length > 0 ? (
                <>
                  <span className="font-semibold text-gray-700">{updatableCount}</span> sản phẩm sẵn sàng cập nhật
                  {nonUpdatableCount > 0 && (
                    <span className="text-orange-500 ml-2">
                      ({nonUpdatableCount} sản phẩm không có variant ID — chỉ cập nhật được sản phẩm từ danh mục Sapo)
                    </span>
                  )}
                </>
              ) : (
                'Chưa có sản phẩm nào. Upload file Excel hoặc chọn thủ công để bắt đầu.'
              )}
            </div>
            <button
              onClick={handleUpdatePrices}
              disabled={isUpdating || updatableCount === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                isUpdating || updatableCount === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
              }`}
            >
              <Send className="w-4 h-4" />
              {isUpdating ? 'Đang cập nhật...' : `Cập nhật giá lên Sapo (${updatableCount})`}
            </button>
          </div>

          {/* Update result */}
          {updateResult && (
            <div className={`mt-4 p-4 rounded-xl text-sm ${
              updateResult.failed === 0
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              <div className="font-bold mb-1">
                {updateResult.failed === 0 ? '✅ Cập nhật thành công!' : '⚠️ Cập nhật hoàn tất (có lỗi)'}
              </div>
              <div>
                Thành công: <strong>{updateResult.success}</strong> | Thất bại: <strong>{updateResult.failed}</strong>
              </div>
              {updateResult.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs space-y-0.5">
                  {updateResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MultiSelectModal */}
      {isMultiSelectOpen && (
        <MultiSelectModal
          onClose={() => setIsMultiSelectOpen(false)}
          onAddSelectedProducts={handleConfirmMultiSelectProducts}
          alreadyStagedProductIds={products.map((p) => p.id)}
          masterProducts={masterProducts}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4">
          <span>Elmich - Cập nhật giá Sapo © 2026</span>
        </div>
      </footer>
    </div>
  );
}
