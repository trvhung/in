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
