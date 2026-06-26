import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export function Barcode({
  value,
  format = 'CODE128',
  width = 1.3,
  height = 40,
  displayValue = false,
  fontSize = 11,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 4,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('JsBarcode failed to render barcode:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 p-2 text-xs text-gray-400 bg-gray-50 h-[40px] rounded">
        Chưa có mã vạch
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center overflow-hidden">
      <svg ref={svgRef} id={`barcode-${value}`} className="max-w-full h-auto" />
    </div>
  );
}
