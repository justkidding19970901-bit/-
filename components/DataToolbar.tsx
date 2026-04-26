import React, { useRef } from 'react';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { ExcelImport } from './ExcelImport';
import type { ImportMode } from '../lib/syncMerge';

interface Props {
  products: Product[];
  onReplace: (next: Product[]) => void;
  onImportProducts: (products: Product[], mode: ImportMode) => void;
}

export const DataToolbar: React.FC<Props> = ({ products, onReplace, onImportProducts }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      products,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    a.download = `products-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming: Product[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.products)
          ? parsed.products
          : [];
      if (!incoming.length) {
        alert('檔案內沒有商品資料');
        return;
      }
      const normalized = incoming.map((p, i) => ({
        ...EMPTY_PRODUCT,
        ...p,
        id: p.id || `imp_${Date.now()}_${i}`,
      }));
      const replace = products.length === 0
        ? true
        : confirm(
            `目前清單有 ${products.length} 筆商品，匯入 ${normalized.length} 筆：\n` +
            `OK = 取代全部 / Cancel = 合併追加`,
          );
      onReplace(replace ? normalized : [...products, ...normalized]);
    } catch (err) {
      alert(`匯入失敗：${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center text-xs">
      <button
        onClick={downloadBackup}
        disabled={products.length === 0}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-300 text-white rounded font-medium"
      >
        💾 下載備份檔（JSON）
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-medium"
      >
        📂 還原 / 匯入備份
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />
      <ExcelImport onImport={(rows, opts) => onImportProducts(rows, opts.mode)} />
      <span className="text-slate-500 ml-1 hidden sm:inline">
        備份檔 / Excel 都可在不同裝置間搬資料
      </span>
    </div>
  );
};
