import React, { useState, useEffect } from 'react';
import type { Product } from './types';
import { ProductForm } from './components/ProductForm';
import { ProductList } from './components/ProductList';
import { ExportPanel } from './components/ExportPanel';
import { ScrapeImport } from './components/ScrapeImport';
import { CollectionScrape } from './components/CollectionScrape';
import { DataToolbar } from './components/DataToolbar';
import { BulkActions } from './components/BulkActions';
import { mergeProducts, type ImportMode, type MergeReport } from './lib/syncMerge';

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
  const [syncMode, setSyncMode] = useState<boolean>(true);
  const [lastReport, setLastReport] = useState<MergeReport | null>(null);

  const importProducts = (incoming: Product[], mode: ImportMode) => {
    if (!incoming.length) return;
    setProducts(prev => {
      const { next, report } = mergeProducts(prev, incoming, mode);
      setLastReport(report);
      return next;
    });
    // Auto-clear the toast after 6 seconds
    setTimeout(() => setLastReport(null), 6000);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      // localStorage typically caps at ~5MB; warn the user once
      console.warn('localStorage 存取失敗，可能已超過容量上限', e);
    }
  }, [products]);

  // Global keyboard shortcut: Cmd/Ctrl+S downloads a backup
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (products.length === 0) return;
        const payload = { version: 1, exportedAt: new Date().toISOString(), products };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
        a.download = `products-backup-${ts}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
    importProducts(newOnes, syncMode ? 'sync' : 'append');
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

  const handleSplitToVariants = (replacingId: string | null, variants: Product[]) => {
    setProducts(prev => {
      const filtered = replacingId ? prev.filter(p => p.id !== replacingId) : prev;
      return [...filtered, ...variants];
    });
    setEditing(null);
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
          <DataToolbar products={products} onReplace={setProducts} onImportProducts={importProducts} />
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={syncMode}
                onChange={e => setSyncMode(e.target.checked)} />
              <span className="font-medium">SKU 增量同步</span>
              <span className="text-slate-400">— 抓取重複商品時自動更新而非新增</span>
            </label>
          </div>
          {storageWarn && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              ⚠️ 已超過 200 件商品，瀏覽器儲存空間可能不足。建議「下載備份檔」並考慮分批處理。
            </div>
          )}
          {lastReport && (
            <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1"
                 role="status" aria-live="polite">
              ✓ 匯入 {lastReport.total} 筆 — 新增 {lastReport.added}、更新 {lastReport.updated}、未變更 {lastReport.unchanged}
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
              onSplitToVariants={handleSplitToVariants}
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
