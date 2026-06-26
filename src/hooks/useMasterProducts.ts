import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';

interface UseMasterProductsReturn {
  masterProducts: Product[];
  isLoading: boolean;
  lastUpdated: string;
  syncError: string | null;
  syncSapo: () => Promise<{ count: number; lastUpdated: string }>;
  loadProducts: () => Promise<void>;
}

export function useMasterProducts(): UseMasterProductsReturn {
  const [masterProducts, setMasterProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return localStorage.getItem('sapoLastUpdated') || 'Chưa đồng bộ';
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sapo/products');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const products: Product[] = await res.json();
      setMasterProducts(products);
    } catch (err: any) {
      console.error('Failed to load master products:', err);
      setSyncError(err.message || 'Không thể tải dữ liệu sản phẩm');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncSapo = useCallback(async () => {
    setSyncError(null);
    const res = await fetch('/api/sapo/sync', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Sync failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    const formattedDate =
      new Date(data.lastUpdated).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date(data.lastUpdated).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    setLastUpdated(formattedDate);
    localStorage.setItem('sapoLastUpdated', formattedDate);
    await loadProducts();
    return data;
  }, [loadProducts]);

  // Load on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return { masterProducts, isLoading, lastUpdated, syncError, syncSapo, loadProducts };
}
