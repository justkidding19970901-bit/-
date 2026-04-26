import React, { useMemo, useState } from 'react';
import type { Product, Platform } from '../types';
import { buildCSV, downloadCSV, PLATFORM_META, validateForPlatform } from '../lib/csvExport';
import { CsvPreview } from './CsvPreview';

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
  const [auditPlatform, setAuditPlatform] = useState<Platform | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<Platform | null>(null);

  const previewCsv = useMemo(
    () => (previewPlatform ? buildCSV(previewPlatform, products) : ''),
    [previewPlatform, products],
  );

  const issues = useMemo(() => {
    if (!auditPlatform) return [];
    return validateForPlatform(auditPlatform, products);
  }, [auditPlatform, products]);

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

      <div className="space-y-1.5 mb-2">
        {platforms.map(p => (
          <div key={p} className="flex gap-1.5">
            <button
              onClick={() => exportOne(p)}
              disabled={disabled}
              className={`flex-1 ${PLATFORM_META[p].color} disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 px-3 rounded-md text-sm transition flex items-center justify-between`}
            >
              <span className="font-bold">⬇ {PLATFORM_META[p].label}</span>
              <span className={`${DIFFICULTY_STYLE[PLATFORM_META[p].difficulty]} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                {PLATFORM_META[p].difficulty}
              </span>
            </button>
            <button
              onClick={() => setPreviewPlatform(p)}
              disabled={disabled}
              title="預覽 CSV 內容"
              aria-label={`預覽 ${PLATFORM_META[p].label} CSV`}
              className="shrink-0 px-2 py-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 text-xs rounded-md"
            >
              👁
            </button>
            <button
              onClick={() => setAuditPlatform(auditPlatform === p ? null : p)}
              disabled={disabled}
              title="檢查欄位是否齊全"
              className="shrink-0 px-2 py-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 text-xs rounded-md"
            >
              ✓
            </button>
          </div>
        ))}
      </div>

      {previewPlatform && (
        <CsvPreview
          platform={previewPlatform}
          csv={previewCsv}
          onClose={() => setPreviewPlatform(null)}
        />
      )}

      <button onClick={exportAll} disabled={disabled}
        className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-md text-sm transition">
        一鍵下載全部（{platforms.length} 個檔案）
      </button>

      {auditPlatform && (
        <div className="mt-3 border border-slate-200 bg-white rounded p-3 text-xs">
          <div className="flex justify-between mb-2">
            <strong className="text-slate-800">
              {PLATFORM_META[auditPlatform].label} 檢查結果
            </strong>
            <button onClick={() => setAuditPlatform(null)} className="text-slate-400 hover:text-red-600">×</button>
          </div>
          {issues.length === 0 ? (
            <div className="text-emerald-700">✓ 所有商品都通過必填檢查</div>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {issues.map((iss, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span className={iss.level === 'error' ? 'text-red-600 font-bold' : 'text-amber-600'}>
                    {iss.level === 'error' ? '✗' : '!'}
                  </span>
                  <span className="text-slate-700">
                    <span className="font-medium">{iss.productName}</span>
                    <span className="text-slate-500"> — {iss.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
