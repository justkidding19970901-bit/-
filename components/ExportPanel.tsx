import React from 'react';
import type { Product, Platform } from '../types';
import { buildCSV, downloadCSV, PLATFORM_META } from '../lib/csvExport';

interface Props {
  products: Product[];
}

export const ExportPanel: React.FC<Props> = ({ products }) => {
  const disabled = products.length === 0;

  const exportOne = (platform: Platform) => {
    const csv = buildCSV(platform, products);
    downloadCSV(PLATFORM_META[platform].filename, csv);
  };

  const exportAll = () => {
    (Object.keys(PLATFORM_META) as Platform[]).forEach(p => exportOne(p));
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800">匯出上架表格</h2>
        <span className="text-xs text-slate-500">已新增 {products.length} 件商品</span>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        產生各平台批次上架 CSV。下載後登入賣家後台 → 商品管理 → 批次匯入 → 上傳檔案即可一次上架。
        <br />
        <span className="text-amber-700">
          ⚠️ 各平台範本欄位以你後台實際範本為準，必要時可在 Excel 微調欄位順序。
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        {(Object.keys(PLATFORM_META) as Platform[]).map(p => (
          <button key={p}
            onClick={() => exportOne(p)}
            disabled={disabled}
            className={`${PLATFORM_META[p].color} disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-3 rounded-md text-sm transition`}>
            下載 {PLATFORM_META[p].label}
          </button>
        ))}
      </div>

      <button onClick={exportAll} disabled={disabled}
        className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-3 rounded-md text-sm transition">
        一鍵下載全部（3 個檔案）
      </button>
    </div>
  );
};
