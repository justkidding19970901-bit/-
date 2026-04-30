import React, { useRef } from 'react';
import type { Product } from '../types';
import { ExcelImport } from './ExcelImport';
import type { ImportMode } from '../lib/syncMerge';
import { normalizeBackup } from '../lib/migration';
import { showAlert, showChoice } from '../lib/dialog';

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
      const normalized = normalizeBackup(parsed);
      if (!normalized.length) {
        await showAlert({ title: '檔案內沒有商品資料' });
        return;
      }
      if (products.length === 0) {
        onReplace(normalized);
        return;
      }
      const choice = await showChoice<'replace' | 'append'>({
        title: '匯入備份檔',
        body: `目前有 ${products.length} 筆商品，備份檔內含 ${normalized.length} 筆。要怎麼處理？`,
        actions: [
          { label: '合併追加', value: 'append', variant: 'primary' },
          { label: '取代全部', value: 'replace', variant: 'destructive' },
        ],
      });
      if (choice === 'replace') onReplace(normalized);
      else if (choice === 'append') onReplace([...products, ...normalized]);
    } catch (err) {
      await showAlert({ title: '匯入失敗', body: (err as Error).message });
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
