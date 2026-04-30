import React, { useRef, useState } from 'react';
import type { Product } from '../types';
import { readExcelFile, rowsToProducts, type ImportResult } from '../lib/excelImport';

interface Props {
  onImport: (products: Product[], options: { mode: 'append' | 'replace' | 'sync' }) => void;
}

export const ExcelImport: React.FC<Props> = ({ onImport }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'append' | 'replace' | 'sync'>('sync');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const rows = await readExcelFile(file);
      const parsed = rowsToProducts(rows);
      if (!parsed.rows.length) {
        setError('檔案內沒有可匯入的商品（請確認第一列是欄位名稱，且至少包含「商品名稱」與「售價」）');
        return;
      }
      setResult(parsed);
    } catch (err) {
      setError(`讀取失敗：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    onImport(result.rows, { mode });
    setResult(null);
  };

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded font-medium text-xs"
      >
        {busy ? '解析中…' : '📊 匯入 Excel / CSV'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,.ods,.numbers"
        className="hidden"
        onChange={handleFile}
      />

      {error && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
             onClick={() => setError('')}>
          <div className="bg-white rounded-lg p-4 max-w-md text-sm shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="text-red-700 mb-2">❌ {error}</div>
            <button onClick={() => setError('')}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded">關閉</button>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
             role="dialog" aria-modal="true" aria-label="Excel 匯入預覽"
             onClick={() => setResult(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full flex flex-col"
               onClick={e => e.stopPropagation()}>
            <header className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-800">📊 匯入預覽</h2>
                {result.format === 'easystore' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ 偵測到 EasyStore 匯出檔
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                辨識到 {result.rows.length} 筆有效商品（總列數 {result.totalSourceRows}）
                {result.format === 'easystore' && (
                  <span className="ml-1 text-emerald-700">
                    · 變體已展開、12 張圖已合併、HTML 已清理、3 倉庫存已加總
                  </span>
                )}
              </p>
            </header>

            {result.unmapped.length > 0 && (
              <div className="mx-4 mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                <div className="font-semibold">以下欄位無法自動對應，將被忽略：</div>
                <div className="mt-1 break-all">{result.unmapped.join('、')}</div>
                <div className="mt-1 text-amber-600">
                  如需匯入，請改用支援的欄位名（例：商品名稱、售價、庫存、商品圖片網址、規格、商品描述）
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto px-4 py-2">
              <table className="text-xs border-collapse w-max">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    <th className="border px-2 py-1 bg-slate-200">#</th>
                    <th className="border px-2 py-1 text-left">名稱</th>
                    <th className="border px-2 py-1 text-left">SKU</th>
                    <th className="border px-2 py-1 text-left">售價</th>
                    <th className="border px-2 py-1 text-left">庫存</th>
                    <th className="border px-2 py-1 text-left">分類</th>
                    <th className="border px-2 py-1 text-left">規格</th>
                    <th className="border px-2 py-1 text-left">圖片</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 30).map((p, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1 text-slate-400">{i + 1}</td>
                      <td className="border px-2 py-1">{p.name}</td>
                      <td className="border px-2 py-1 font-mono">{p.model}</td>
                      <td className="border px-2 py-1">${p.price}</td>
                      <td className="border px-2 py-1">{p.stock}</td>
                      <td className="border px-2 py-1">{p.category}</td>
                      <td className="border px-2 py-1">{p.specs.length}</td>
                      <td className="border px-2 py-1">{p.imageUrls.length}</td>
                    </tr>
                  ))}
                  {result.rows.length > 30 && (
                    <tr>
                      <td colSpan={8} className="border px-2 py-1 italic text-slate-500">
                        …還有 {result.rows.length - 30} 筆
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input type="radio" name="import-mode" checked={mode === 'sync'}
                    onChange={() => setMode('sync')} />
                  按 SKU 同步（重複的更新，新的新增）
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name="import-mode" checked={mode === 'append'}
                    onChange={() => setMode('append')} />
                  全部新增
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name="import-mode" checked={mode === 'replace'}
                    onChange={() => setMode('replace')} />
                  取代全部
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setResult(null)}
                  className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-100 rounded">
                  取消
                </button>
                <button onClick={handleConfirm}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded">
                  ✓ 確認匯入 {result.rows.length} 筆
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};
