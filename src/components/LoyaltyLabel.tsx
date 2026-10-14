import { LabelTemplate, Product } from '../types';
import elmichLogo from '../assets/elmich-logo.png';

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
  const promoPrice = product.price > 0 ? product.price : listPrice;

  const tiers = [
    { label: 'Member', percent: percents.member, color: '#E31E24', labelClass: 'text-[21px] font-bold' },
    { label: 'VIP', percent: percents.vip, color: '#F7941D', labelClass: 'text-[21px] font-bold' },
    { label: 'VVIP', percent: percents.vvip, color: '#111111', labelClass: 'text-[13px] font-normal' },
  ];

  return (
    <div
      className={`bg-white text-black flex flex-col overflow-hidden relative select-none border border-gray-300 px-[9px] pt-[5px] pb-[3px] ${className}`}
      style={{ width: template.width, height: template.height, pageBreakInside: 'avoid' }}
    >
      <div className="flex justify-center">
        <img src={elmichLogo} alt="Elmich" className="h-[15px] w-auto" />
      </div>

      <div className="text-center text-[12.5px] font-black tracking-[0.04em] leading-none mt-[3px] whitespace-nowrap">
        GIÁ ĐẶC QUYỀN THÀNH VIÊN
      </div>

      <div className="flex justify-between items-baseline mt-[4px] leading-none text-[8px]">
        <div className="flex items-baseline gap-1">
          <span>Giá NY:</span>
          <span className="text-[10px] font-semibold">{fmt(listPrice)}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-bold">Giá KM:</span>
          <span className="text-[10px] font-bold">{fmt(promoPrice)}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col mt-[2px]">
        {tiers.map((tier, i) => (
          <div
            key={tier.label}
            className={`flex-1 flex items-center leading-none ${i < tiers.length - 1 ? 'border-b border-[#6B7194]' : ''}`}
          >
            <span className={`w-[42%] ${tier.labelClass}`} style={{ color: tier.color }}>
              {tier.label}
            </span>
            <span
              className={`w-[20%] text-[12px] ${i < 2 ? 'font-semibold' : ''}`}
              style={{ color: tier.color }}
            >
              -{tier.percent}%
            </span>
            <span className="flex-1 text-right text-[15px] font-bold tracking-tight" style={{ color: tier.color }}>
              {fmt(calcMemberPrice(promoPrice, tier.percent, rounding))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
