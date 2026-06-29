# Pallet Label Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pallet label printing feature with URL routing (`/`, `/gia`, `/pallet`) to the Elmich barcode label app.

**Architecture:** Install react-router-dom for client-side routing. Extract current App content into PriceLabelPage. Create HomePage with two option buttons. Create PalletLabelPage with form inputs and A3 print layout (10×4 grid, 40 labels/sheet, Code128 barcodes rotated 90°).

**Tech Stack:** React 19, TypeScript, Vite 6, TailwindCSS 4, react-router-dom 7, JsBarcode 3

## Global Constraints

- URL routing: `/` (home), `/gia` (price labels), `/pallet` (pallet labels)
- Pallet label size: 22mm × 95mm, no border, no internal margins
- A3 portrait: 297mm × 420mm, 10 columns × 4 rows, 4mm gap
- Code format: `PLT-{MM}{YY}-{XXXXX}`, each code repeated 2× consecutively
- Barcode: Code128, rotated 90° vertical, margin: 0, no displayValue
- Code text: Arial 7pt, displayed vertically alongside barcode
- Print via `window.print()` with `@page { size: A3 portrait }`

---

### Task 1: Install react-router-dom and configure Vercel rewrite

**Files:**
- Modify: `package.json`
- Modify: `vercel.json`

**Interfaces:**
- Produces: `react-router-dom` available for import; Vercel serves index.html for all client routes

- [ ] **Step 1: Install react-router-dom**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Update vercel.json with catch-all rewrite**

Read `vercel.json`, then replace with:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

- [ ] **Step 3: Verify install**

```bash
npx tsc --noEmit
```
Expected: no new type errors from the install.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vercel.json
git commit -m "chore: add react-router-dom, configure Vercel SPA rewrites"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 2: Add PalletConfig type to types.ts

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `PalletConfig { month: number; year: number; quantity: number }`

- [ ] **Step 1: Add PalletConfig interface**

Read `src/types.ts`, then append at end of file:

```ts
export interface PalletConfig {
  month: number;    // 1-12
  year: number;     // e.g. 2025
  quantity: number; // số lượng tem pallet
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add PalletConfig type"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 3: Add rotate and margin props to Barcode component

**Files:**
- Modify: `src/components/Barcode.tsx`

**Interfaces:**
- Consumes: none
- Produces: `Barcode({ rotate?: boolean, margin?: number, ...existing props })` — when `rotate` is true, the SVG is wrapped in a div with `transform: rotate(90deg)`; `margin` controls JsBarcode margin (default 4, pallet labels use 0)

- [ ] **Step 1: Add rotate and margin props with rotation wrapper**

Read `Barcode.tsx`, then make these changes:

Add `rotate?: boolean` and `margin?: number` to the interface:

```ts
interface BarcodeProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  rotate?: boolean;
  margin?: number;
}
```

Add to destructuring (default `margin: 4`, `rotate: false`):

```ts
export function Barcode({
  value,
  format = 'CODE128',
  width = 1.3,
  height = 40,
  displayValue = false,
  fontSize = 11,
  rotate = false,
  margin = 4,
}: BarcodeProps) {
```

Also update the JsBarcode call: change `margin: 4` to `margin` (the prop):

In the `useEffect`, find:
```ts
          margin: 4,
```
Replace with:
```ts
          margin,
```

Wrap the return JSX. Replace the final `return (...)` block:

```tsx
  const barcodeSvg = (
    <div className="flex justify-center items-center overflow-hidden">
      <svg ref={svgRef} id={`barcode-${value}`} className="max-w-full h-auto" />
    </div>
  );

  if (rotate) {
    return (
      <div className="flex justify-center items-center" style={{ transform: 'rotate(90deg)', transformOrigin: 'center center' }}>
        {barcodeSvg}
      </div>
    );
  }

  return barcodeSvg;
```

Note: the empty-value fallback (`if (!value)`) return stays unchanged — it returns early before reaching the rotated wrapper.

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Barcode.tsx
git commit -m "feat: add rotate prop to Barcode component for vertical labels"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 4: Create HomePage component

**Files:**
- Create: `src/components/HomePage.tsx`

**Interfaces:**
- Consumes: none (uses react-router-dom's `useNavigate`)
- Produces: `<HomePage />` — renders two large buttons linking to `/gia` and `/pallet`

- [ ] **Step 1: Write HomePage component**

Create `src/components/HomePage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { Printer, Package } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg inline-flex items-center justify-center mb-4">
          <Printer className="w-10 h-10" />
        </div>
        <h1 className="font-bold text-gray-900 text-2xl tracking-tight">
          Elmich - Ứng dụng in tem mã vạch
        </h1>
        <p className="text-gray-500 text-sm mt-1">Chọn loại tem bạn muốn tạo</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => navigate('/gia')}
          className="bg-white border-2 border-blue-500 hover:bg-blue-50 text-gray-800 rounded-2xl p-6 shadow-sm transition-all active:scale-[0.98] cursor-pointer text-left flex items-center gap-4 group"
        >
          <div className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
            <Printer className="w-8 h-8" />
          </div>
          <div>
            <div className="font-bold text-lg">TẠO TEM GIÁ</div>
            <div className="text-sm text-gray-500">Sale + Giá Niêm Yết</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/pallet')}
          className="bg-white border-2 border-emerald-500 hover:bg-emerald-50 text-gray-800 rounded-2xl p-6 shadow-sm transition-all active:scale-[0.98] cursor-pointer text-left flex items-center gap-4 group"
        >
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-200 transition-colors">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <div className="font-bold text-lg">TẠO TEM PALLET</div>
            <div className="text-sm text-gray-500">PLT-mmyy-xxxxx</div>
          </div>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HomePage.tsx
git commit -m "feat: add HomePage with two navigation buttons"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 5: Extract PriceLabelPage from App.tsx

**Files:**
- Create: `src/components/PriceLabelPage.tsx`
- Modify: `src/App.tsx` (prepare for routing — actual routing in Task 8)

**Interfaces:**
- Consumes: `Product`, `LabelTemplate` from `types.ts`; `ProductList`, `PrintPreview`, `PrintLayout`, `MultiSelectModal`, `Barcode` from components; `useMasterProducts` hook
- Produces: `<PriceLabelPage />` — the entire current App functionality as a standalone page component

- [ ] **Step 1: Create PriceLabelPage component**

Create `src/components/PriceLabelPage.tsx` by copying ALL the current content of `src/App.tsx`, then:

1. Remove the outer `<div className="min-h-screen...">` wrapper — keep only the inner content
2. Add a "← Quay lại" back button at the top
3. Add `import { useNavigate } from 'react-router-dom';` at the top
4. Add `const navigate = useNavigate();` inside the component
5. Wrap the current content in a fragment `<>...</>`

The full component structure:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, LabelTemplate } from '../types';
import { ProductList } from './ProductList';
import { PrintPreview } from './PrintPreview';
import { PrintLayout } from './PrintLayout';
import { Barcode } from './Barcode';
import { MultiSelectModal } from './MultiSelectModal';
import { useMasterProducts } from '../hooks/useMasterProducts';
import {
  Printer,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Database,
  ArrowLeft,
} from 'lucide-react';

const INITIAL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'sale-70x40',
    name: 'Tem Sale (Mica 70x40mm)',
    width: '70mm',
    height: '40mm',
    columns: 1,
    description: 'Khổ cài mica kệ hàng 70x40mm',
    showName: true,
    showPrice: true,
    showComparePrice: true,
    showSku: true,
    showBarcodeText: false,
    showBarcode: false,
    bgColor: '#FFFFFF',
  },
  {
    id: 'list-price',
    name: 'Tem Giá Niêm Yết (35x22mm)',
    width: '35mm',
    height: '22mm',
    columns: 1,
    description: 'Tem giá niêm yết khổ 35x22mm - Tên, SKU, Barcode lớn, Giá niêm yết',
    showName: true,
    showPrice: false,
    showComparePrice: true,
    showSku: true,
    showBarcodeText: false,
    showBarcode: true,
  },
];

export function PriceLabelPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeProductId, setActiveProductId] = useState<string>('m1');
  const [templates, setTemplates] = useState<LabelTemplate[]>(INITIAL_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('sale-70x40');
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

  // Add single product from live search
  const handleAddProduct = (itemToAdd: Product) => {
    const existing = products.find((p) => p.sku === itemToAdd.sku || (p.barcode && p.barcode === itemToAdd.barcode));

    if (existing) {
      const newQty = existing.quantity === 0 ? 1 : existing.quantity + 1;
      handleUpdateProduct(existing.id, { quantity: newQty });
      setActiveProductId(existing.id);
    } else {
      setProducts((prev) => [{ ...itemToAdd, quantity: 1 }, ...prev]);
      setActiveProductId(itemToAdd.id);
    }
  };

  // Batch add products (from Excel upload)
  const handleAddProducts = (itemsToAdd: Product[]) => {
    setProducts((prev) => {
      const list = [...prev];
      for (const item of itemsToAdd) {
        const existing = list.find(
          (p) => p.sku === item.sku || (p.barcode && p.barcode === item.barcode)
        );
        if (existing) {
          existing.quantity = existing.quantity + 1;
        } else {
          list.push({ ...item, quantity: 1 });
        }
      }
      return list;
    });
    if (itemsToAdd.length > 0) {
      setActiveProductId(itemsToAdd[0].id);
    }
  };

  // Batch insert selected products from multi select modal
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

  const printableLabels = products.flatMap((p) =>
    Array.from({ length: p.quantity }, () => p)
  );

  return (
    <>
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
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
            
            {/* Sapo Integration Sync Panel */}
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

            {/* TWO COLUMN GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left: Product details and list (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <ProductList
                  products={products}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAddProduct={handleAddProduct}
                  onAddProducts={handleAddProducts}
                  onOpenMultiSelect={() => setIsMultiSelectOpen(true)}
                  activeProductId={activeProductId}
                  onSelectProduct={setActiveProductId}
                  masterProducts={masterProducts}
                />
              </div>

              {/* Right: Barcode label templates & preview (4 cols) */}
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

        {/* 2. PHYSICAL PRINT BATCH PREVIEW MODAL */}
        {isPrintLayoutOpen && (
          <PrintLayout
            products={products}
            template={activeTemplate}
            onClose={() => setIsPrintLayoutOpen(false)}
          />
        )}

        {/* 3. MULTI SELECT PRODUCT CATALOG MODAL */}
        {isMultiSelectOpen && (
          <MultiSelectModal
            onClose={() => setIsMultiSelectOpen(false)}
            onAddSelectedProducts={handleConfirmMultiSelectProducts}
            alreadyStagedProductIds={products.map((p) => p.id)}
            masterProducts={masterProducts}
          />
        )}

        {/* 4. TRUE PHYSICAL PRINT SHEET */}
        <div className="hidden print-only bg-white text-black p-0 w-full">
          <div
            className="flex flex-wrap gap-1 bg-white"
            style={{
              justifyContent: 'flex-start',
            }}
          >
            {printableLabels.map((p, index) => {
              const sizeWidth = activeTemplate.width;
              const sizeHeight = activeTemplate.height;

              if (activeTemplate.id.startsWith('sale-')) {
                const discountPercent = p.price > 0 && p.comparePrice && p.comparePrice > p.price
                  ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
                  : 50;
                const displayPrice = p.price > 0 ? p.price : (p.comparePrice || 0);
                const hasStrikeThrough = p.price > 0 && p.comparePrice && p.comparePrice > p.price;

                return (
                  <div
                    key={index}
                    className="flex flex-col justify-between text-black transition-all overflow-hidden relative select-none text-left border border-gray-300"
                    style={{
                      width: sizeWidth,
                      height: sizeHeight,
                      pageBreakInside: 'avoid',
                      backgroundColor: activeTemplate.bgColor || '#FFFFFF',
                    }}
                  >
                    <div className="absolute top-0 left-0 bg-[#E30613] text-white flex flex-col items-center justify-center font-bold leading-none w-[56px] h-[56px] select-none">
                      <div className="text-[9px] tracking-widest uppercase font-black">SALE</div>
                      <div className="text-[20px] font-black mt-0.5 leading-none tracking-tighter">
                        {discountPercent}%
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col pt-1.5 pb-0.5">
                      {activeTemplate.showName && (
                        <div className="text-[10px] font-medium text-slate-900 leading-tight line-clamp-2 uppercase tracking-tight pl-[60px] pr-1">
                          {p.name}
                        </div>
                      )}

                      <div className="flex-1" />

                      <div className="flex justify-between items-end px-1">
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
                        {!activeTemplate.showSku && <div />}
                        {!hasStrikeThrough && activeTemplate.showComparePrice && <div />}
                      </div>

                      <div className="flex justify-center items-baseline">
                        {activeTemplate.showPrice && (
                          <>
                            <span className="text-[53px] font-semibold text-[#E30613] leading-none tracking-tighter">
                              {displayPrice.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[10px] font-semibold text-[#E30613] ml-0.5">VND</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (activeTemplate.id === 'list-price') {
                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-300 flex flex-col items-center text-center relative overflow-hidden select-none p-1"
                    style={{
                      width: sizeWidth,
                      height: sizeHeight,
                      pageBreakInside: 'avoid',
                    }}
                  >
                    {activeTemplate.showName && (
                      <div className="text-[8px] font-bold text-gray-900 leading-tight line-clamp-2 uppercase w-full text-center">
                        {p.name}
                      </div>
                    )}
                    {activeTemplate.showSku && (
                      <div className="text-[6px] font-medium text-gray-500 w-full text-center">
                        {p.sku}
                      </div>
                    )}

                    {activeTemplate.showBarcode !== false && (
                      <div className="flex-1 flex items-center justify-center w-full">
                        <Barcode
                          value={p.barcode || p.sku}
                          displayValue={activeTemplate.showBarcodeText}
                          height={24}
                          fontSize={6}
                        />
                      </div>
                    )}

                    {activeTemplate.showComparePrice && p.comparePrice && p.comparePrice > 0 && (
                      <div className="text-[14px] font-extrabold text-gray-900 w-full text-center leading-none">
                        {p.comparePrice.toLocaleString('vi-VN')}đ
                      </div>
                    )}
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
                  {activeTemplate.showName && (
                    <div className="leading-tight font-bold text-gray-900 text-[10px] overflow-hidden line-clamp-2 uppercase">
                      {p.name}
                    </div>
                  )}

                  {activeTemplate.showSku && (
                    <div className="font-mono text-gray-600 font-bold text-[8px] tracking-wider mt-0.5">
                      SKU: {p.sku}
                    </div>
                  )}

                  {activeTemplate.showBarcode !== false ? (
                    <div className="flex-1 flex items-center justify-center my-0.5">
                      <Barcode
                        value={p.barcode || p.sku}
                        displayValue={activeTemplate.showBarcodeText}
                        height={32}
                        fontSize={8}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[8px] text-gray-400 italic">
                      (Mã vạch ẩn)
                    </div>
                  )}

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

        {/* Footer */}
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
    </>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PriceLabelPage.tsx
git commit -m "feat: extract PriceLabelPage from App.tsx"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 6: Create PalletLabelPage component (form + print)

**Files:**
- Create: `src/components/PalletLabelPage.tsx`

**Interfaces:**
- Consumes: `PalletConfig` from `types.ts`; `Barcode` (with new `rotate` prop)
- Produces: `<PalletLabelPage />` — form inputs (month, year, quantity) and A3 print grid (10×4, barcode rotated 90°)

- [ ] **Step 1: Write PalletLabelPage component**

Create `src/components/PalletLabelPage.tsx`:

```tsx
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

const LABELS_PER_PAGE = 40; // 10 columns × 4 rows
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
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Số lượng tem</label>
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
                <div className="text-xs text-gray-500 mb-1">Mã tem sẽ tạo:</div>
                <div className="text-sm font-mono font-bold text-gray-800">
                  {firstCode} → {lastUniqueCode}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {uniqueCount} mã duy nhất × 2 = {codes.length} tem / {totalPages} tờ A3
                </div>
              </div>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Xem trước & In
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
            Quay lại chỉnh sửa
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
                {/* Barcode rotated 90° */}
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
                {/* Code text - also rotated 90°, displayed vertically */}
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
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PalletLabelPage.tsx
git commit -m "feat: add PalletLabelPage with form and A3 print layout"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 7: Update App.tsx with BrowserRouter and Routes

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `HomePage`, `PriceLabelPage`, `PalletLabelPage` components
- Produces: App with `<BrowserRouter>` and 3 routes: `/`, `/gia`, `/pallet`

- [ ] **Step 1: Replace App.tsx with router setup**

Replace the entire content of `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { PriceLabelPage } from './components/PriceLabelPage';
import { PalletLabelPage } from './components/PalletLabelPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gia" element={<PriceLabelPage />} />
        <Route path="/pallet" element={<PalletLabelPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify the build works**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Verify Vite dev server resolves routes**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add BrowserRouter with /, /gia, /pallet routes"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Task 8: Verify and final cleanup

**Files:**
- No new files

- [ ] **Step 1: Run full type check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: build succeeds, output in `dist/`.

- [ ] **Step 3: Review all changed files**

```bash
git diff --stat HEAD
```

- [ ] **Step 4: Push all commits**

```bash
git push origin main
```

---
