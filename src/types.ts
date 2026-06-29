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

export interface LabelTemplate {
  id: string;
  name: string;
  width: string; // e.g. "75mm"
  height: string; // e.g. "50mm"
  columns: number; // 1, 2, or 3 labels per row
  description: string;
  showName: boolean;
  showPrice: boolean;
  showComparePrice?: boolean;
  showSku: boolean;
  showBarcodeText: boolean;
  showBarcode?: boolean;
  bgColor?: string; // màu nền cho sale template
}

export interface PalletConfig {
  month: number;    // 1-12
  year: number;     // e.g. 2025
  quantity: number; // số lượng tem pallet
}
