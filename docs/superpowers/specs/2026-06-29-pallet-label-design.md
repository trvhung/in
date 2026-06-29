# Thiết kế: Tính năng Tạo Tem Pallet

**Ngày:** 2026-06-29
**Trạng thái:** Chờ review

---

## 1. Tổng quan

Thêm tính năng "Tạo tem pallet" vào ứng dụng in tem mã vạch Elmich. Người dùng có thể chọn tháng, năm, số lượng để tạo ra các tem pallet mã Code128, in trên giấy A3 dọc với layout 10 cột × 4 hàng.

## 2. Điều hướng (Routing)

State-based routing trong `App.tsx` với 3 màn hình:

| State | Màn hình | Mô tả |
|-------|----------|-------|
| `home` | Trang chủ | 2 nút lớn: "Tạo tem giá" và "Tạo tem pallet" |
| `price-label` | Tem giá | Giao diện hiện tại (ProductList + PrintPreview) |
| `pallet-label` | Tem pallet | Form nhập liệu + trang in |

Mỗi màn hình con có nút "← Quay lại" để về Home.

## 3. Trang chủ (Home)

Layout đơn giản, centered:

```
┌──────────────────────────────────────┐
│        🖨️ Elmich - Ứng dụng        │
│           in tem mã vạch             │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  📋  TẠO TEM GIÁ             │    │
│  │  Sale + Giá Niêm Yết         │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🏗️  TẠO TEM PALLET          │    │
│  │  PLT-mmyy-xxxxx              │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

## 4. Trang Tạo Tem Pallet

### 4.1 Form nhập liệu

- **Tháng**: dropdown 01-12, mặc định tháng hiện tại
- **Năm**: dropdown (2025-2035), mặc định năm hiện tại
- **Số lượng tem**: input number, số nguyên dương
- **Xem trước mã**: hiển thị mã đầu tiên và mã cuối cùng sẽ được tạo
  - VD: `PLT-0925-00001 → PLT-0925-00020`
- **Nút "Xem trước & In"**: mở trang in

### 4.2 Logic sinh mã

- Số lượng N tem → ceil(N/2) mã duy nhất
- Mỗi mã in 2 lần liên tiếp (ngoại trừ mã cuối nếu N lẻ: in 1 lần)
- Định dạng mã: `PLT-{MM}{YY}-{XXXXX}`
  - MM: tháng (2 chữ số)
  - YY: năm (2 chữ số cuối)
  - XXXXX: số thứ tự 5 chữ số, bắt đầu từ 00001

**Ví dụ:**
- N = 40 → 20 mã (00001→00020), mỗi mã ×2 = 40 tem = 1 tờ
- N = 41 → 21 mã (00001→00021), 20 mã đầu ×2 + mã cuối ×1 = 41 tem = 2 tờ (tờ 2 có 1 tem)

## 5. Trang In Tem Pallet

### 5.1 Khổ giấy & Layout

- **Giấy**: A3 dọc (297mm × 420mm)
- **Grid**: 10 cột × 4 hàng = 40 tem/tờ
- **Kích thước mỗi tem**: 22mm (rộng) × 95mm (cao)
- **Khoảng cách giữa các tem**: 4mm (cả ngang và dọc)

**Tính toán kích thước tổng:**
- Chiều ngang: 10×22 + 9×4 = 220 + 36 = 256mm → vừa trong 297mm (căn giữa)
- Chiều dọc: 4×95 + 3×4 = 380 + 12 = 392mm → vừa trong 420mm (căn giữa)

### 5.2 Nội dung mỗi tem (22mm × 95mm, xoay dọc)

```
┌────────────────────┐
│████████████████████│
│████ BARCODE ██████│  ← Barcode Code128 xoay dọc 90°
│████ CODE128 ██████│     không lề, sát mép tem
│████████████████████│
│████████████████████│
│                    │
│  PLT-0925-00001    │  ← Mã hiển thị dọc, cùng chiều barcode
│                    │     Font: Arial 7pt, không lề trong
└────────────────────┘
  ←── 22mm ──→
```

**Chi tiết:**
- **Barcode**: Code128, render bằng JsBarcode (margin: 0), xoay 90° bằng CSS `transform: rotate(90deg)`
- **Mã PLT**: hiển thị dọc (rotate 90°), font Arial 7pt, nằm cạnh hoặc dưới barcode
- **Không viền** (no border)
- **Không lề bên trong tem** (no padding/margin inside label)
- **Không có text dưới barcode** (displayValue: false)

### 5.3 Phân trang

- Mỗi tờ A3 chứa tối đa 40 tem
- Nếu số lượng > 40, tự động chia thành nhiều trang
- Trang cuối có thể không đầy đủ 40 tem

### 5.4 In ấn

- Dùng `window.print()` + CSS `@media print`
- `@page { size: A3 portrait; margin: 0; }`
- Ẩn tất cả UI controls khi in (`.no-print`)
- Chỉ hiển thị sheet tem khi in (`.print-only`)

## 6. Cấu trúc file

### File mới

| File | Mô tả |
|------|-------|
| `src/components/HomePage.tsx` | Trang chủ với 2 nút chọn chế độ |
| `src/components/PalletLabelForm.tsx` | Form nhập tháng/năm/số lượng |
| `src/components/PalletLabelPrint.tsx` | Trang in tem pallet (grid 10×4) |

### File sửa

| File | Thay đổi |
|------|----------|
| `src/App.tsx` | Thêm state-based routing (home / price-label / pallet-label) |
| `src/types.ts` | Thêm type `PalletConfig` nếu cần |
| `src/components/Barcode.tsx` | Thêm prop `rotate?: boolean` để hỗ trợ xoay 90° |

## 7. Types bổ sung

```ts
// types.ts
export interface PalletConfig {
  month: number;    // 1-12
  year: number;     // 2025-2035
  quantity: number; // số lượng tem
}

export interface PalletCode {
  code: string;     // PLT-0925-00001
  index: number;    // thứ tự 1-based
}
```

## 8. Luồng người dùng

```
Home → Click "Tạo tem pallet"
  → Form: chọn tháng, năm, số lượng
  → Click "Xem trước & In"
  → Xem trang in (grid 10×4)
  → Ctrl+P hoặc nút In
  → In ra giấy A3
  → "← Quay lại" để về Home
```

---

## Spec Self-Review

- ✅ Không có placeholder TBD/TODO
- ✅ Tính toán layout khớp với A3: 256mm × 392mm nằm gọn trong 297mm × 420mm
- ✅ Logic sinh mã rõ ràng: ceil(N/2) mã, mỗi mã ×2 (mã cuối ×1 nếu lẻ)
- ✅ Tái sử dụng component Barcode hiện có
- ✅ Không thay đổi router/framework, giữ nguyên stack React + Vite + TailwindCSS
