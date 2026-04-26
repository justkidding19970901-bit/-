import React, { useState, useEffect } from 'react';
import type { Product } from './types';
import { ProductForm } from './components/ProductForm';
import { ProductList } from './components/ProductList';
import { ExportPanel } from './components/ExportPanel';
import { ScrapeImport } from './components/ScrapeImport';
import { CollectionScrape } from './components/CollectionScrape';
import { DataToolbar } from './components/DataToolbar';
import { BulkActions } from './components/BulkActions';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      // localStorage typically caps at ~5MB; warn the user once
      console.warn('localStorage 存取失敗，可能已超過容量上限', e);
    }
  }, [products]);

  // Drop selection ids that no longer point to existing products
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const existing = new Set(products.map(p => p.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (existing.has(id)) next.add(id);
      else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [products, selectedIds]);

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

  const handleSaveMany = (newOnes: Product[]) => {
    if (!newOnes.length) return;
    setProducts(prev => [...prev, ...newOnes]);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  const handleDuplicate = (p: Product) => {
    const copy: Product = {
      ...p,
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${p.name} (複本)`,
      model: p.model ? `${p.model}-COPY` : '',
    };
    setProducts(prev => [...prev, copy]);
  };

  const handleClearAll = () => {
    if (products.length === 0) return;
    if (confirm(`確定清空全部 ${products.length} 件商品？此動作無法復原。建議先「下載備份檔」。`)) {
      setProducts([]);
      setSelectedIds(new Set());
      setEditing(null);
    }
  };

  const storageWarn = products.length > 200;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                🚚 商品搬家系統
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                自架站 → Pinkoi / 蝦皮 / 露天 / Yahoo / Momo 一鍵匯出 CSV
              </p>
            </div>
            <button onClick={handleClearAll}
              className="text-xs text-slate-500 hover:text-red-600 underline shrink-0">
              清空全部
            </button>
          </div>
          <DataToolbar products={products} onReplace={setProducts} />
          {storageWarn && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              ⚠️ 已超過 200 件商品，瀏覽器儲存空間可能不足。建議「下載備份檔」並考慮分批處理。
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-4">
          <CollectionScrape onImportMany={handleSaveMany} />
          <ScrapeImport onImport={handleSave} onImportMany={handleSaveMany} />
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <ProductForm
              editing={editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </section>

        <section className="lg:col-span-2 space-y-4 lg:sticky lg:top-[140px] lg:self-start">
          <ExportPanel products={products} />
          <BulkActions
            products={products}
            selectedIds={selectedIds}
            onUpdate={setProducts}
            onClearSelection={() => setSelectedIds(new Set())}
          />
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-3">商品清單</h2>
            <ProductList
              products={products}
              onEdit={setEditing}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        資料儲存於本機瀏覽器，重新整理不會遺失。清除瀏覽器資料前請先「下載備份檔」。
      </footer>
    </div>
  );
};

export default App;
