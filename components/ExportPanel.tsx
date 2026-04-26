import React from 'react';
import type { Product, Platform } from '../types';
import { buildCSV, downloadCSV, PLATFORM_META } from '../lib/csvExport';

interface Props {
  products: Product[];
}

const DIFFICULTY_STYLE: Record<'寬鬆' | '中等' | '嚴格', string> = {
  寬鬆: 'bg-emerald-100 text-emerald-700',
  中等: 'bg-amber-100 text-amber-700',
  嚴格: 'bg-rose-100 text-rose-700',
};

export const ExportPanel: React.FC<Props> = ({ products }) => {
  const disabled = products.length === 0;
  const platforms = Object.keys(PLATFORM_META) as Platform[];

  const exportOne = (platform: Platform) => {
    const csv = buildCSV(platform, products);
    downloadCSV(PLATFORM_META[platform].filename, csv);
  };

  const exportAll = () => platforms.forEach(exportOne);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800">匯出上架表格</h2>
        <span className="text-xs text-slate-500">已新增 {products.length} 件商品</span>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        下載 CSV → 登入賣家後台 → 商品管理 → 批次匯入 → 上傳檔案。
        <br />
        <span className="text-emerald-700">
          ✓ 建議先試 <strong>Pinkoi</strong>（規則寬鬆），驗證流程通了再上嚴格的 Momo。
        </span>
      </p>

      <div className="space-y-2 mb-2">
        {platforms.map(p => (
          <button key={p}
            onClick={() => exportOne(p)}
            disabled={disabled}
            className={`w-full ${PLATFORM_META[p].color} disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded-md text-sm transition flex items-center justify-between`}>
            <span className="font-bold">⬇ {PLATFORM_META[p].label}</span>
            <span className={`${DIFFICULTY_STYLE[PLATFORM_META[p].difficulty]} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
              {PLATFORM_META[p].difficulty}
            </span>
          </button>
        ))}
      </div>

      <button onClick={exportAll} disabled={disabled}
        className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-3 rounded-md text-sm transition">
        一鍵下載全部（3 個檔案）
      </button>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
          各平台規則提醒
        </summary>
        <ul className="mt-2 text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
          {platforms.map(p => (
            <li key={p}>
              <strong>{PLATFORM_META[p].label}</strong>：{PLATFORM_META[p].hint}
            </li>
          ))}
          <li className="text-amber-700 pt-1">
            如匯入失敗，到該平台後台下載官方範本，比對欄位名稱即可調整。
          </li>
        </ul>
      </details>
    </div>
  );
};
