import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('elmich-auth') === 'true'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsChecking(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        sessionStorage.setItem('elmich-auth', 'true');
        setIsAuthenticated(true);
      } else {
        const data = await res.json().catch(() => ({ error: 'Sai mật khẩu' }));
        setError(data.error || 'Sai mật khẩu');
        setPassword('');
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setIsChecking(false);
    }
  };

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg inline-flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="font-bold text-gray-900 text-xl tracking-tight">
            Elmich - Cập nhật giá Sapo
          </h1>
          <p className="text-gray-500 text-sm mt-1">Nhập mật khẩu để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Mật khẩu"
            autoFocus
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
          />

          {error && (
            <p className="text-red-500 text-xs mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={isChecking || !password.trim()}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
              isChecking || !password.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
            }`}
          >
            {isChecking ? 'Đang kiểm tra...' : (
              <>
                Mở khóa <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
