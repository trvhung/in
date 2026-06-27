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
}
