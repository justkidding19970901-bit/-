import React, { useState, useEffect } from 'react';
import type { Product } from './types';
import { ProductForm } from './components/ProductForm';
import { ProductList } from './components/ProductList';
import { ExportPanel } from './components/ExportPanel';
import { ScrapeImport } from './components/ScrapeImport';

const STORAGE_KEY = 'product_migration_v1';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Product[]) : [];
    } catch {
      return [];
    }
  });
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [products]);

  const handleSave = (p: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = p;
        return copy;
      }
      return [...prev, p];
    });
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  const handleClearAll = () => {
    if (products.length === 0) return;
    if (confirm(`確定清空全部 ${products.length} 件商品？此動作無法復原。`)) {
      setProducts([]);
      setEditing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              🚚 商品搬家系統
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              一次填寫 → 產生 Momo / Yahoo / Pinkoi 批次上架 CSV
            </p>
          </div>
          <button onClick={handleClearAll}
            className="text-xs text-slate-500 hover:text-red-600 underline">
            清空全部
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-4">
          <ScrapeImport onImport={handleSave} />
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <ProductForm
              editing={editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <ExportPanel products={products} />
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-3">商品清單</h2>
            <ProductList
              products={products}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        資料儲存於本機瀏覽器，重新整理不會遺失。清除瀏覽器資料前請先匯出 CSV。
      </footer>
    </div>
  );
};

export default App;
