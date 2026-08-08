# Chuyển đổi app thành Cập nhật giá Sapo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa toàn bộ tính năng in tem (pallet + giá), giữ sync Sapo, xây mới trang cập nhật giá với upload file + chọn thủ công.

**Architecture:** App chỉ còn 1 route `/` với `PriceUpdatePage` component. Trang này gồm: sync panel (từ Sapo), khu vực upload file Excel (parse SKU+giá, match với masterProducts), khu vực chọn thủ công (MultiSelectModal → ProductList), và nút gọi API update giá lên Sapo. API mới `POST /api/sapo/update-prices` gọi Sapo PUT variant endpoint.

**Tech Stack:** React 18, TypeScript, Vite, Express, XLSX, react-router-dom, Tailwind CSS, lucide-react

## Global Constraints

- Chỉ 1 route `/` — không còn `/gia`, `/pallet`
- Xóa sạch code in tem: `PalletLabelPage`, `PriceLabelPage`, `PrintPreview`, `PrintLayout`, `Barcode`, `BarcodeScanner`, `generatePalletPDF`
- Giữ nguyên `MultiSelectModal` (không sửa), `useMasterProducts` (không sửa)
- `ProductList` sửa lại: bỏ cột "SL tem", giữ SKU/Tên/Giá bán/Giá niêm yết, thêm nút xóa
- App title mới: "Elmich - Cập nhật giá Sapo"
- API update giá gọi Sapo: `PUT /admin/variants/{id}.json` với Basic Auth

---

### Task 1: Xóa các file không còn dùng

**Files:**
- Delete: `src/components/PalletLabelPage.tsx`
- Delete: `src/components/PriceLabelPage.tsx`
- Delete: `src/components/PrintPreview.tsx`
- Delete: `src/components/PrintLayout.tsx`
- Delete: `src/components/Barcode.tsx`
- Delete: `src/components/BarcodeScanner.tsx`
- Delete: `src/utils/generatePalletPDF.ts`

**Interfaces:**
- Consumes: nothing
- Produces: clean slate, các file đã xóa không còn tồn tại

- [ ] **Step 1: Xóa tất cả 7 file**

```bash
rm src/components/PalletLabelPage.tsx
rm src/components/PriceLabelPage.tsx
rm src/components/PrintPreview.tsx
rm src/components/PrintLayout.tsx
rm src/components/Barcode.tsx
rm src/components/BarcodeScanner.tsx
rm src/utils/generatePalletPDF.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove pallet and price label printing components"
```

---

### Task 2: Dọn dẹp types.ts — xóa PalletConfig và LabelTemplate

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Product` interface (giữ nguyên), xóa `PalletConfig` và `LabelTemplate`

- [ ] **Step 1: Sửa `src/types.ts` — chỉ giữ lại `Product`**

Xóa dòng 13-33 (toàn bộ `LabelTemplate` và `PalletConfig`). File sau khi sửa:

```typescript
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  price: number;
  comparePrice?: number; // "Giá niêm yết"
  category?: string; // For filtering in "Chọn nhiều" popup
  image?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "chore: remove PalletConfig and LabelTemplate types"
```

---

### Task 3: Sửa App.tsx — chỉ còn 1 route `/`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `PriceUpdatePage` (tạo ở Task 5)
- Produces: App với `<BrowserRouter>`, 1 route `/` → `<PriceUpdatePage />`

- [ ] **Step 1: Sửa `src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PriceUpdatePage } from './components/PriceUpdatePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PriceUpdatePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: single route / for price update page"
```

---

### Task 4: Sửa ProductList — bỏ cột SL tem, tối ưu cho cập nhật giá

**Files:**
- Modify: `src/components/ProductList.tsx`

**Interfaces:**
- Consumes: `Product` từ `types.ts`
- Produces:
  - Props: `{ products: Product[], onUpdateProduct: (id, Partial<Product>) => void, onDeleteProduct: (id) => void, onAddProduct: (Product) => void, onAddProducts: (Product[]) => void, onOpenMultiSelect: () => void, masterProducts: Product[] }`
  - Component giữ search dropdown, upload Excel, chọn nhiều, bảng sản phẩm với các cột: Sản phẩm, Giá bán, Giá niêm yết, Xóa

- [ ] **Step 1: Sửa `ProductList.tsx`**

Các thay đổi:
1. Bỏ import `HelpCircle` (dòng 3)
2. Xóa `activeProductId`, `onSelectProduct` khỏi props interface
3. Xóa `totalQty` useMemo (dòng 68-72)
4. Sửa header bảng: bỏ "SL tem", đổi thành 4 cột: Sản phẩm | Giá bán | Giá niêm yết | Xóa
5. Sửa grid row: `grid-cols-12` → giữ layout nhưng bỏ cột SL tem, đổi tỉ lệ
6. Bỏ `isActive` highlight logic, bỏ `onClick` chọn sản phẩm
7. Sửa empty state text: "Chưa chọn sản phẩm nào để cập nhật giá"
8. Sửa help banner text: "Gợi ý: Upload file Excel (SKU, Giá bán, Giá niêm yết) để thêm nhanh sản phẩm vào danh sách cập nhật giá."

Chi tiết từng thay đổi:

**Props interface mới (dòng 6-16):**
```typescript
interface ProductListProps {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAddProduct: (product: Product) => void;
  onAddProducts: (products: Product[]) => void;
  onOpenMultiSelect: () => void;
  masterProducts: Product[];
}
```

**Destructure props (dòng 18-28):**
```typescript
export function ProductList({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  onAddProducts,
  onOpenMultiSelect,
  masterProducts,
}: ProductListProps) {
```

**Bỏ `totalQty` useMemo (dòng 68-72)** — xóa hoàn toàn.

**Header bảng (dòng 314-322) — thay bằng:**
```typescript
<div className="grid grid-cols-12 px-4 py-3 text-xs font-bold text-gray-700 bg-gray-50 rounded-t-xl border-b border-gray-200">
  <div className="col-span-6 flex items-center">
    Sản phẩm ({products.length})
  </div>
  <div className="col-span-2 text-center">Giá bán</div>
  <div className="col-span-3 text-center">Giá niêm yết</div>
  <div className="col-span-1 text-right"></div>
</div>
```

**Row template (dòng 326-421) — sửa lại:**
- Đổi `col-span-5` → `col-span-6` cho cột sản phẩm
- Bỏ toàn bộ cột "SL tem" (`col-span-2` với input quantity)
- Bỏ `isActive` logic, bỏ `onClick={() => onSelectProduct(p.id)}`, bỏ `border-l-2` conditional
- Giữ cột Giá bán (`col-span-2`), Giá niêm yết (`col-span-3`), Xóa (`col-span-1`)

```typescript
{products.map((p) => (
  <div
    key={p.id}
    className="grid grid-cols-12 items-center px-4 py-3 text-sm transition-all hover:bg-slate-50/70"
  >
    {/* Product avatar, metadata, name */}
    <div className="col-span-6 flex items-center gap-3 pr-2">
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
    <div className="col-span-2 px-1 text-center" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center max-w-[95px] mx-auto">
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

    {/* Giá Niêm Yết Input */}
    <div className="col-span-3 px-1 text-center" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center max-w-[110px] mx-auto">
        <input
          type="text"
          value={formatNumber(p.comparePrice)}
          placeholder=""
          onChange={(e) => {
            const num = parseNumber(e.target.value);
            onUpdateProduct(p.id, { comparePrice: num });
          }}
          className="w-full text-right pr-4 pl-1 border border-gray-200 rounded-lg py-1 text-xs md:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <span className="absolute right-1.5 text-[10px] md:text-xs text-gray-400">đ</span>
      </div>
    </div>

    {/* Delete button */}
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
))}
```

**Empty state text (dòng 424-431) — sửa:**
```typescript
<div className="text-center py-20 text-gray-400 text-xs flex flex-col items-center gap-2 bg-slate-50/50">
  <span className="text-xl">📋</span>
  <span className="font-medium">Chưa chọn sản phẩm nào để cập nhật giá</span>
  <p className="text-[11px] text-gray-400 max-w-sm mt-1">
    Hãy nhập tìm kiếm sản phẩm phía trên hoặc nhấn <strong className="text-blue-600 font-bold">Chọn nhiều</strong> để đưa các mặt hàng vào danh sách cập nhật giá.
  </p>
</div>
```

**Help banner text (dòng 434-438) — sửa:**
```typescript
<div className="mt-3.5 text-[11px] text-gray-400 flex items-center gap-1.5">
  <HelpCircle className="w-3.5 h-3.5 text-gray-300" />
  <span>Gợi ý: Upload file Excel (SKU, Giá bán, Giá niêm yết) để thêm nhanh sản phẩm vào danh sách cập nhật giá.</span>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductList.tsx
git commit -m "refactor: ProductList for price update (remove qty column, update copy)"
```

---

### Task 5: Tạo PriceUpdatePage component mới

**Files:**
- Create: `src/components/PriceUpdatePage.tsx`

**Interfaces:**
- Consumes: `Product` từ `types.ts`, `useMasterProducts` hook, `ProductList`, `MultiSelectModal`, `Database`, `RefreshCw`, `CheckCircle2`, `Upload`, `Download` icons từ lucide-react
- Produces: `<PriceUpdatePage />` — trang chủ duy nhất với sync panel + upload file + chọn thủ công + nút cập nhật giá

- [ ] **Step 1: Viết `PriceUpdatePage.tsx`**

```typescript
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
    isLoading: isMasterLoading,
    lastUpdated: sapoLastUpdated,
    syncError: sapoSyncError,
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

    setIsUpdating(true);
    setUpdateResult(null);

    try {
      const updates = validProducts.map((p) => ({
        variantId: extractVariantId(p)!,
        price: p.price,
        comparePrice: p.comparePrice || undefined,
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
        failed: products.length,
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
                <span className="text-gray-400">Lần cập nhật cuối:</span>
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
                  {isSyncing ? 'Đang cập nhật...' : 'Đồng bộ sản phẩm Sapo'}
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
              updateResult.failed === 0 ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PriceUpdatePage.tsx
git commit -m "feat: add PriceUpdatePage with sync, upload, manual select, and Sapo update"
```

---

### Task 6: Thêm API endpoint cập nhật giá lên Sapo

**Files:**
- Modify: `api/index.ts`

**Interfaces:**
- Consumes: `AUTH_HEADER`, `SAPO_BASE` (đã có trong file)
- Produces: `POST /api/sapo/update-prices` — nhận `{ updates: [{ variantId, price, comparePrice? }] }`, gọi Sapo API, trả về `{ success, failed, errors }`

- [ ] **Step 1: Thêm route `POST /api/sapo/update-prices` vào `api/index.ts`**

Thêm vào trước dòng `export default app;` (cuối file):

```typescript
app.post('/api/sapo/update-prices', async (req, res) => {
  try {
    const { updates } = req.body as {
      updates: { variantId: number; price: number; comparePrice?: number }[];
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Missing or empty updates array' });
    }

    console.log(`[update-prices] Updating ${updates.length} variants...`);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Update each variant one by one (Sapo doesn't support batch variant update)
    for (const update of updates) {
      try {
        const body: Record<string, any> = { variant: { price: update.price } };
        if (update.comparePrice && update.comparePrice > 0) {
          body.variant.compare_at_price = update.comparePrice;
        }

        const url = `${SAPO_BASE}/admin/variants/${update.variantId}.json`;
        const apiRes = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: AUTH_HEADER,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (apiRes.ok) {
          success++;
        } else {
          failed++;
          const errData = await apiRes.json().catch(() => ({}));
          errors.push(`Variant ${update.variantId}: HTTP ${apiRes.status} — ${(errData as any).errors || 'Unknown error'}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`Variant ${update.variantId}: ${err.message}`);
      }
    }

    console.log(`[update-prices] Done: ${success} success, ${failed} failed`);
    res.json({ success, failed, errors });
  } catch (err: any) {
    console.error('[update-prices] Error:', err.message);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add api/index.ts
git commit -m "feat: add POST /api/sapo/update-prices endpoint"
```

---

### Task 7: Cập nhật metadata — title và index.html

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing
- Produces: title mới "Elmich - Cập nhật giá Sapo"

- [ ] **Step 1: Sửa `<title>` trong `index.html`**

```html
<title>Elmich - Cập nhật giá Sapo</title>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "chore: update page title to Elmich - Cập nhật giá Sapo"
```

---

### Task 8: Kiểm tra build

- [ ] **Step 1: Chạy build để kiểm tra lỗi TypeScript**

```bash
npm run build
```

Expected: Build thành công, không lỗi.

- [ ] **Step 2: Sửa lỗi nếu có, commit fix**

```bash
git add -A
git commit -m "fix: build errors after refactor"
```
