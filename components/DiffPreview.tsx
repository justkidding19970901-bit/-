import React from 'react';
import type { DiffEntry } from '../lib/syncMerge';

interface Props {
  diffs: DiffEntry[];
  onConfirm: () => void;
  onCancel: () => void;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(空)';
  if (typeof v === 'number') return String(v);
  return String(v).slice(0, 80) + (String(v).length > 80 ? '…' : '');
}

const FIELD_LABEL: Record<string, string> = {
  name: '名稱', description: '描述', price: '售價', originalPrice: '原價',
  cost: '成本', stock: '庫存', model: 'SKU', brand: '品牌', category: '分類',
  tags: '標籤', weightG: '重量(g)', condition: '商品狀態', origin: '產地',
  warranty: '保固', shippingDays: '出貨天數', videoUrl: '影片',
  momoCategoryCode: 'Momo分類碼', yahooCategoryCode: 'Yahoo分類碼',
  pinkoiCategory: 'Pinkoi分類', shopeeCategoryCode: 'Shopee分類碼',
  rutenCategoryCode: 'Ruten分類碼', imageUrls: '圖片', specs: '規格',
};

export const DiffPreview: React.FC<Props> = ({ diffs, onConfirm, onCancel }) => {
  const news = diffs.filter(d => d.kind === 'new' || d.kind === 'replace').length;
  const updates = diffs.filter(d => d.kind === 'update').length;
  const removes = diffs.filter(d => d.kind === 'remove').length;
  const unchanged = diffs.filter(d => d.kind === 'unchanged').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" aria-label="同步差異預覽"
         onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full flex flex-col"
           onClick={e => e.stopPropagation()}>
        <header className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">🔍 同步差異預覽</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            <span className="text-emerald-700 font-semibold">新增 {news}</span>　·
            <span className="text-indigo-700 font-semibold">更新 {updates}</span>
            {removes > 0 && (
              <>
                {'　·'}
                <span className="text-rose-700 font-semibold">移除 {removes}</span>
              </>
            )}
            　·<span className="text-slate-500">未變更 {unchanged}</span>
          </p>
        </header>

        <div className="flex-1 overflow-auto px-4 py-2">
          <ul className="space-y-2">
            {diffs.map((d, i) => {
              if (d.kind === 'new') {
                return (
                  <li key={i} className="border border-emerald-200 bg-emerald-50 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">+ 新增</span>
                      <span className="font-semibold text-slate-800">{d.incoming.name}</span>
                      <span className="text-xs text-slate-500">SKU: {d.incoming.model || '(空)'} · ${d.incoming.price}</span>
                    </div>
                  </li>
                );
              }
              if (d.kind === 'replace') {
                return (
                  <li key={i} className="border border-rose-200 bg-rose-50 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">取代</span>
                      <span className="font-semibold text-slate-800">{d.incoming.name}</span>
                    </div>
                  </li>
                );
              }
              if (d.kind === 'remove') {
                return (
                  <li key={i} className="border border-rose-300 bg-rose-50 rounded p-2 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">− 移除</span>
                      <span className="font-semibold text-slate-700 line-through">{d.existing.name}</span>
                      <span className="text-xs text-slate-500">
                        SKU: {d.existing.model || '(空)'} · ${d.existing.price} · 庫存 {d.existing.stock}
                      </span>
                    </div>
                  </li>
                );
              }
              if (d.kind === 'unchanged') {
                return (
                  <li key={i} className="border border-slate-200 bg-slate-50 rounded p-1.5 text-xs flex items-center gap-2 text-slate-500">
                    <span className="text-[10px] font-medium">= 未變更</span>
                    <span>{d.existing.name}</span>
                  </li>
                );
              }
              // update
              return (
                <li key={i} className="border border-indigo-200 bg-indigo-50/50 rounded p-2 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">↻ 更新</span>
                    <span className="font-semibold text-slate-800">{d.before.name}</span>
                    <span className="text-xs text-slate-500">SKU: {d.before.model}</span>
                  </div>
                  <table className="text-xs w-full">
                    <tbody>
                      {d.changes.map((c, ci) => (
                        <tr key={ci} className="border-b last:border-0 border-indigo-100">
                          <td className="py-0.5 pr-2 text-slate-600 w-24 font-medium">
                            {FIELD_LABEL[c.field] ?? c.field}
                          </td>
                          <td className="py-0.5 pr-2 text-rose-700 line-through">{formatValue(c.from)}</td>
                          <td className="py-0.5 pr-2 text-slate-400">→</td>
                          <td className="py-0.5 text-emerald-700 font-medium">{formatValue(c.to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button onClick={onCancel}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-100 rounded">
            取消
          </button>
          <button onClick={onConfirm}
            className="px-4 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded">
            ✓ 確認套用 ({news + updates + removes} 筆變更)
          </button>
        </footer>
      </div>
    </div>
  );
};
