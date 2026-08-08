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
