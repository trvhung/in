import { LabelTemplate, Product } from '../types';
import elmichLogo from '../assets/elmich-logo.svg';

export const DEFAULT_LOYALTY_PERCENTS = { member: 10, vip: 13, vvip: 15 };

// Giá thành viên = Giá KM giảm thêm x%, làm tròn theo bước (vd 1.000đ)
export function calcMemberPrice(base: number, percent: number, rounding = 1000) {
  if (base <= 0) return 0;
  const raw = base * (1 - percent / 100);
  const step = rounding > 0 ? rounding : 1;
  return Math.round(raw / step) * step;
}

const fmt = (n: number) => (n > 0 ? n.toLocaleString('vi-VN') : '');

interface LoyaltyLabelProps {
  product: Product;
  template: LabelTemplate;
  className?: string;
}

export function LoyaltyLabel({ product, template, className = '' }: LoyaltyLabelProps) {
  const percents = { ...DEFAULT_LOYALTY_PERCENTS, ...template.loyaltyPercents };
  const rounding = template.loyaltyRounding ?? 1000;
  const listPrice = product.comparePrice || 0;
  const hasPromo = template.showPrice !== false && product.price > 0;
  // Tắt hiện giá bán hoặc không có giá bán → ẩn Giá KM, giá thành viên tính theo Giá NY
  const promoPrice = hasPromo ? product.price : listPrice;
  const showSku = template.showSku !== false;

  const tiers = [
    { label: 'Member', percent: percents.member, color: '#E31E24', labelClass: 'text-[13.5px] font-bold' },
    { label: 'VIP', percent: percents.vip, color: '#F7941D', labelClass: 'text-[13.5px] font-bold' },
    { label: 'VVIP', percent: percents.vvip, color: '#111111', labelClass: 'text-[10.5px] font-normal' },
  ];

  return (
    <div
      className={`bg-white text-black flex flex-col overflow-hidden relative select-none border border-gray-300 px-[9px] pt-[5px] pb-[4px] ${className}`}
      style={{ width: template.width, height: template.height, pageBreakInside: 'avoid' }}
    >
      <div className="flex justify-center">
        <img src={elmichLogo} alt="Elmich" className="h-[16px] w-auto" />
      </div>

      <div className="text-center text-[12.5px] font-bold tracking-[0.03em] leading-none mt-[3.5px] whitespace-nowrap">
        GIÁ ĐẶC QUYỀN THÀNH VIÊN
      </div>

      {product.name && (
        <div className="truncate text-center text-[9.5px] font-bold text-gray-900 uppercase mt-[4px] leading-[1.15]" title={product.name}>
          {product.name}
        </div>
      )}

      {showSku && product.sku && (
        <div className="text-center text-[10px] font-semibold text-gray-700 font-mono tracking-wide mt-[2px] leading-none">
          <span>SKU: </span>
          <span className="font-bold text-gray-900">{product.sku}</span>
        </div>
      )}

      <div className={`flex ${hasPromo ? 'justify-between' : 'justify-center'} items-baseline mt-[5px] text-[8.5px] leading-none`}>
        <div className="flex items-baseline gap-1">
          <span className="text-gray-500">Giá NY:</span>
          <span className="text-[11.5px] font-semibold text-gray-800">{fmt(listPrice)}</span>
        </div>
        {hasPromo && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-gray-800">Giá KM:</span>
            <span className="text-[12px] font-bold text-gray-950">{fmt(promoPrice)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col mt-[5px] border-t border-[#6B7194]">
        {tiers.map((tier, i) => (
          <div
            key={tier.label}
            className={`flex-1 flex items-center leading-none ${i < tiers.length - 1 ? 'border-b border-[#6B7194]' : ''}`}
          >
            <span className={`w-[42%] ${tier.labelClass}`} style={{ color: tier.color }}>
              {tier.label}
            </span>
            <span
              className={`w-[20%] text-[10px] ${i < 2 ? 'font-semibold' : ''}`}
              style={{ color: tier.color }}
            >
              -{tier.percent}%
            </span>
            <span className="flex-1 text-right text-[12px] font-bold tracking-tight" style={{ color: tier.color }}>
              {fmt(calcMemberPrice(promoPrice, tier.percent, rounding))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
