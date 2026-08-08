import { useState, useCallback } from 'react';
import { Product } from '../types';
import { ProductList } from './ProductList';
import { MultiSelectModal } from './MultiSelectModal';
import { useMasterProducts } from '../hooks/useMasterProducts';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react';

interface UpdateResultItem {
  variantId: number;
  sku: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  status: 'success' | 'failed';
  error?: string;
}

interface UpdateLog {
  id: string;
  timestamp: string;
  results: UpdateResultItem[];
  success: number;
  failed: number;
}

const LOG_STORAGE_KEY = 'sapo-price-update-logs';

function loadLogs(): UpdateLog[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: UpdateLog[]) {
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
}

export function PriceUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastResults, setLastResults] = useState<UpdateResultItem[] | null>(null);
  const [lastSummary, setLastSummary] = useState<{ success: number; failed: number } | null>(null);
  const [logs, setLogs] = useState<UpdateLog[]>(loadLogs);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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

  // Find old price from masterProducts by SKU
  const findOldPrice = useCallback((sku: string): number => {
    const master = masterProducts.find((m) => m.sku.toLowerCase() === sku.toLowerCase());
    return master ? master.price : 0;
  }, [masterProducts]);

  const formatPrice = (price: number) => {
    if (!price) return '0đ';
    return price.toLocaleString('vi-VN') + 'đ';
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
    setLastResults(null);
    setLastSummary(null);

    try {
      const updates = validProducts.map((p) => ({
        variantId: extractVariantId(p)!,
        sku: p.sku,
        name: p.name,
        oldPrice: findOldPrice(p.sku),
        newPrice: p.price,
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

      const results: UpdateResultItem[] = data.results || [];
      const summary = { success: data.success || 0, failed: data.failed || 0 };

      setLastResults(results);
      setLastSummary(summary);

      // Save to log
      const log: UpdateLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('vi-VN'),
        results,
        success: summary.success,
        failed: summary.failed,
      };
      const updatedLogs = [log, ...logs].slice(0, 50); // keep last 50
      setLogs(updatedLogs);
      saveLogs(updatedLogs);

    } catch (err: any) {
      setLastSummary({ success: 0, failed: validProducts.length });
      setLastResults(validProducts.map((p) => ({
        variantId: extractVariantId(p)!,
        sku: p.sku,
        name: p.name,
        oldPrice: findOldPrice(p.sku),
        newPrice: p.price,
        status: 'failed' as const,
        error: err.message || 'Lỗi không xác định',
      })));
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

          {/* Update result detail table */}
          {lastResults && lastSummary && (
            <div className="mt-4">
              <div className={`p-3 rounded-xl text-sm font-bold mb-3 ${
                lastSummary.failed === 0
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {lastSummary.failed === 0
                  ? '✅ Cập nhật thành công!'
                  : `⚠️ Cập nhật hoàn tất: ${lastSummary.success} thành công, ${lastSummary.failed} thất bại`}
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 font-semibold">
                      <th className="text-left px-3 py-2 w-8">#</th>
                      <th className="text-left px-3 py-2">SKU</th>
                      <th className="text-left px-3 py-2">Tên sản phẩm</th>
                      <th className="text-right px-3 py-2">Giá cũ</th>
                      <th className="text-right px-3 py-2">Giá mới</th>
                      <th className="text-center px-3 py-2 w-20">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lastResults.map((item, i) => (
                      <tr key={i} className={item.status === 'failed' ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-gray-700">{item.sku}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{item.name}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{formatPrice(item.oldPrice)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatPrice(item.newPrice)}</td>
                        <td className="px-3 py-2 text-center">
                          {item.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 font-semibold" title={item.error}>
                              <XCircle className="w-3.5 h-3.5" /> Lỗi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* History Logs */}
        {logs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 cursor-pointer w-full text-left"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              Lịch sử cập nhật ({logs.length})
              {showHistory ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                    >
                      <div className={`w-2 h-2 rounded-full ${log.failed === 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-semibold text-gray-700">{log.timestamp}</span>
                      <span className="text-xs text-gray-500">
                        {log.success} thành công, {log.failed} thất bại
                      </span>
                      {expandedLogId === log.id ? (
                        <ChevronUp className="w-4 h-4 ml-auto text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                      )}
                    </button>

                    {expandedLogId === log.id && (
                      <div className="overflow-x-auto border-t border-gray-100">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 font-semibold">
                              <th className="text-left px-3 py-1.5">SKU</th>
                              <th className="text-left px-3 py-1.5">Tên</th>
                              <th className="text-right px-3 py-1.5">Giá cũ</th>
                              <th className="text-right px-3 py-1.5">Giá mới</th>
                              <th className="text-center px-3 py-1.5 w-16">KQ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {log.results.map((item, i) => (
                              <tr key={i} className={item.status === 'failed' ? 'bg-red-50/30' : ''}>
                                <td className="px-3 py-1.5 font-mono text-gray-700">{item.sku}</td>
                                <td className="px-3 py-1.5 text-gray-600 max-w-[180px] truncate">{item.name}</td>
                                <td className="px-3 py-1.5 text-right text-gray-400">{formatPrice(item.oldPrice)}</td>
                                <td className="px-3 py-1.5 text-right font-semibold text-blue-700">{formatPrice(item.newPrice)}</td>
                                <td className="px-3 py-1.5 text-center">
                                  {item.status === 'success' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-red-400 inline" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
