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
  customSaleLabel?: boolean; // tùy chỉnh text ô SALE
  saleLabelLine1?: string; // dòng 1 trong ô SALE (mặc định "SALE")
  saleLabelLine2?: string; // dòng 2 trong ô SALE (mặc định "50%")
  saleLabelLine1Size?: number; // font size dòng 1 (px)
  saleLabelLine2Size?: number; // font size dòng 2 (px)
  loyaltyPercents?: { member: number; vip: number; vvip: number }; // % giảm thêm trên Giá KM
  loyaltyRounding?: number; // bước làm tròn giá thành viên (đ), vd 1000
}

export interface PalletConfig {
  month: number;    // 1-12
  year: number;     // e.g. 2025
  quantity: number; // số lượng tem pallet
}
