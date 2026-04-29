import React, { useState, useEffect, useRef } from 'react';
import type { Product } from './types';
import { ProductForm } from './components/ProductForm';
import { ProductList } from './components/ProductList';
import { ExportPanel } from './components/ExportPanel';
import { ScrapeImport } from './components/ScrapeImport';
import { CollectionScrape } from './components/CollectionScrape';
import { DataToolbar } from './components/DataToolbar';
import { BulkActions } from './components/BulkActions';
import { mergeProducts, previewMerge, type ImportMode, type MergeReport, type DiffEntry } from './lib/syncMerge';
import { loadProducts, saveProducts, type SaveResult } from './lib/migration';
import { DiffPreview } from './components/DiffPreview';
import { DialogHost, showAlert, showConfirm } from './lib/dialog';
import { makeId } from './lib/id';
import { readExcelFile, rowsToProducts } from './lib/excelImport';

const STORAGE_KEY = 'product_migration_v1';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => loadProducts(STORAGE_KEY));
  const [editing, setEditing] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncMode, setSyncMode] = useState<boolean>(true);
  const [diffPreviewMode, setDiffPreviewMode] = useState<boolean>(true);
  const [lastReport, setLastReport] = useState<MergeReport | null>(null);
  const [pendingImport, setPendingImport] = useState<{ incoming: Product[]; mode: ImportMode; diffs: DiffEntry[] } | null>(null);
  const [saveError, setSaveError] = useState<Extract<SaveResult, { ok: false }> | null>(null);

  const applyImport = (incoming: Product[], mode: ImportMode) => {
    setProducts(prev => {
      const { next, report } = mergeProducts(prev, incoming, mode);
      setLastReport(report);
      return next;
    });
    setTimeout(() => setLastReport(null), 6000);
  };

  const importProducts = (incoming: Product[], mode: ImportMode) => {
    if (!incoming.length) return;
    // Skip the diff preview when nothing exists yet, when previewing is off,
    // or for trivial append-only flows where there's nothing useful to show.
    if (!diffPreviewMode || products.length === 0 || mode === 'append') {
      applyImport(incoming, mode);
      return;
    }
    const diffs = previewMerge(products, incoming, mode);
    const hasMeaningful = diffs.some(
      d => d.kind === 'update' || d.kind === 'replace' || d.kind === 'remove',
    );
    if (!hasMeaningful) {
      applyImport(incoming, mode);
      return;
    }
    setPendingImport({ incoming, mode, diffs });
  };

  const confirmPendingImport = () => {
    if (!pendingImport) return;
    applyImport(pendingImport.incoming, pendingImport.mode);
    setPendingImport(null);
  };

  useEffect(() => {
    const result = saveProducts(STORAGE_KEY, products);
    setSaveError(result.ok ? null : result);
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

  // EasyStore userscript pushes CSV to /__sync. Subscribe to dev-server SSE
  // notifications and auto-pipe the CSV through the same import flow as a
  // manual upload (so DiffPreview / sync-mode toggle still apply).
  const handleSyncRef = useRef<(csv: string) => Promise<void>>(async () => {});
  handleSyncRef.current = async (csv: string) => {
    try {
      const file = new File([csv], 'easystore-sync.csv', { type: 'text/csv' });
      const rows = await readExcelFile(file);
      const result = rowsToProducts(rows);
      if (!result.rows.length) {
        await showAlert({ title: '同步收到的 CSV 沒有可匯入的資料' });
        return;
      }
      importProducts(result.rows, syncMode ? 'sync' : 'append');
    } catch (err) {
      await showAlert({
        title: '同步失敗',
        body: (err as Error).message,
      });
    }
  };

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/__sync/events');
      es.onmessage = async () => {
        try {
          const r = await fetch('/__sync');
          if (!r.ok) return;
          const csv = await r.text();
          handleSyncRef.current(csv);
        } catch {
          /* dev server gone away — ignore */
        }
      };
      es.onerror = () => {
        // SSE auto-reconnects; if the dev server isn't running, this just
        // keeps retrying silently — no need to surface to the user.
      };
    } catch {
      /* EventSource unsupported — ignore */
    }
    return () => es?.close();
  }, []);

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
      id: makeId('p'),
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

  const handleClearAll = async () => {
    if (products.length === 0) return;
    const ok = await showConfirm({
      title: `清空全部 ${products.length} 件商品？`,
      body: '此動作無法復原。建議先下載備份檔再執行。',
      confirmText: '清空',
      destructive: true,
    });
    if (ok) {
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
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={diffPreviewMode}
                onChange={e => setDiffPreviewMode(e.target.checked)} />
              <span className="font-medium">同步前預覽差異</span>
              <span className="text-slate-400">— 看清楚會改哪幾筆再套用</span>
            </label>
          </div>
          {saveError && (
            <div className="text-xs bg-rose-50 border border-rose-300 rounded px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                 role="alert" aria-live="assertive">
              <div className="flex-1 min-w-0 text-rose-900 leading-relaxed">
                <span className="font-bold">⚠️ 資料尚未存進瀏覽器</span>
                <span className="ml-1">
                  {saveError.reason === 'quota'
                    ? '— 儲存空間已滿，目前資料只在記憶體中；重新整理會遺失。請先下載備份檔，再考慮刪除舊資料或分批處理。'
                    : `— 儲存失敗（${saveError.message}）。請立即下載備份檔以免遺失。`}
                </span>
              </div>
              <button
                onClick={() => {
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
                }}
                className="shrink-0 px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold">
                💾 立刻下載備份
              </button>
            </div>
          )}
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
          <ScrapeImport
            onImport={p => handleSaveMany([p])}
            onImportMany={handleSaveMany}
          />
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

      {pendingImport && (
        <DiffPreview
          diffs={pendingImport.diffs}
          onConfirm={confirmPendingImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
      <DialogHost />
    </div>
  );
};

export default App;
