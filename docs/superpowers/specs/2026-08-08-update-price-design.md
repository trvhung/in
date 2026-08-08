# Thiết kế: Chuyển đổi app thành Cập nhật giá Sapo

**Ngày:** 2026-08-08

## 1. Mục tiêu

Chuyển đổi ứng dụng từ "in tem mã vạch" thành "cập nhật giá Sapo":
- Xóa toàn bộ tính năng in tem (pallet + giá)
- Xây mới tính năng cập nhật giá lên Sapo qua 2 cách: upload file hàng loạt và chọn thủ công
- Giữ lại integration đồng bộ sản phẩm Sapo hiện có

## 2. Routes

| Route | Nội dung |
|---|---|
| `/` | Trang chủ duy nhất: sync Sapo + upload file + chọn thủ công + cập nhật giá |

## 3. Kiến trúc component

```
App.tsx
└── PriceUpdatePage (trang duy nhất)
    ├── Sync panel (Sapo sync status + nút đồng bộ)
    ├── Khu vực upload file Excel
    │   ├── File drop zone
    │   └── Bảng preview kết quả match (SKU → Sapo product)
    ├── Hoặc chọn thủ công
    │   ├── Nút mở MultiSelectModal
    │   └── ProductList (đã chọn, có ô nhập giá)
    └── Nút "Cập nhật lên Sapo"
```

## 4. Luồng dữ liệu

### Upload file:
1. User upload file Excel/CSV (cột: SKU, Giá mới, [Giá so sánh])
2. Parse file → mảng `{sku, price, comparePrice?}`
3. Match từng SKU với `masterProducts` (từ Sapo sync) → lấy `variantId` từ `product.id` (format `sapo-{productId}-{variantId}`)
4. Hiện bảng preview: SKU, tên SP, giá hiện tại, giá mới, trạng thái match
5. User bấm "Cập nhật" → gọi `POST /api/sapo/update-prices`

### Chọn thủ công:
1. User bấm "Chọn sản phẩm" → mở MultiSelectModal
2. Chọn sản phẩm từ danh mục → thêm vào ProductList
3. Nhập giá mới cho từng sản phẩm trong ProductList
4. User bấm "Cập nhật" → gọi `POST /api/sapo/update-prices`

## 5. API mới

### POST /api/sapo/update-prices

Request:
```json
{
  "updates": [
    { "variantId": 12345, "price": 150000, "comparePrice": 200000 }
  ]
}
```

Gọi Sapo API: `PUT /admin/variants/{variantId}.json` để update giá variant.

## 6. Files thay đổi

### Xóa:
- `src/components/PalletLabelPage.tsx`
- `src/components/PriceLabelPage.tsx`
- `src/components/PrintPreview.tsx`
- `src/components/PrintLayout.tsx`
- `src/components/Barcode.tsx`
- `src/components/BarcodeScanner.tsx`
- `src/utils/generatePalletPDF.ts`

### Giữ + sửa:
- `src/components/HomePage.tsx` → đổi thành `PriceUpdatePage.tsx`
- `src/components/ProductList.tsx` → sửa để phục vụ cập nhật giá (thêm ô nhập giá)
- `src/components/MultiSelectModal.tsx` → giữ nguyên
- `src/hooks/useMasterProducts.ts` → giữ nguyên
- `src/types.ts` → xóa `PalletConfig`, `LabelTemplate`, giữ `Product`
- `src/App.tsx` → chỉ 1 route `/`
- `api/index.ts` → thêm `POST /api/sapo/update-prices`

### Không đổi:
- `index.html` → đổi title
- `api/index.ts` → thêm endpoint mới, giữ nguyên sync

## 7. Định dạng file upload

File Excel/CSV với các cột:
- **SKU** (bắt buộc): mã SKU của sản phẩm
- **Giá mới** (bắt buộc): giá bán mới
- **Giá so sánh** (tùy chọn): giá gạch ngang (compare_at_price)
