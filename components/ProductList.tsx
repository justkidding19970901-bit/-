import React, { useMemo, useState } from 'react';
import type { Product } from '../types';
import { findDuplicateSkus } from '../lib/csvExport';

interface Props {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export const ProductList: React.FC<Props> = ({
  products, onEdit, onDelete, onDuplicate, selectedIds, onSelectionChange,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.tags.toLowerCase().includes(q),
    );
  }, [products, query]);

  const dupeSkus = useMemo(() => findDuplicateSkus(products), [products]);
  const dupeProductIds = useMemo(() => {
    const s = new Set<string>();
    for (const list of dupeSkus.values()) list.forEach(p => s.add(p.id));
    return s;
  }, [dupeSkus]);

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (filtered.every(p => selectedIds.has(p.id))) {
      const next = new Set(selectedIds);
      filtered.forEach(p => next.delete(p.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(p => next.add(p.id));
      onSelectionChange(next);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
        還沒有商品，從上方抓取或表單新增
      </div>
    );
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="🔍 搜尋名稱 / SKU / 品牌 / 標籤"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <span className="text-xs text-slate-500 shrink-0">
          {filtered.length}/{products.length}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
          全選（含搜尋結果）
        </label>
        {selectedIds.size > 0 && (
          <span className="text-indigo-700 font-semibold">已選 {selectedIds.size} 筆</span>
        )}
      </div>

      {dupeSkus.size > 0 && (
        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
          ⚠️ 偵測到 {dupeSkus.size} 個重複 SKU（共 {dupeProductIds.size} 筆商品） — 用「批次操作 → 修復重複 SKU」自動修
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          沒有符合「{query}」的商品
        </div>
      ) : (
        <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(p => {
            const isDupe = dupeProductIds.has(p.id);
            const isSelected = selectedIds.has(p.id);
            return (
              <li key={p.id}
                className={`flex items-center gap-2 p-3 bg-white border rounded-lg transition ${
                  isSelected ? 'border-indigo-400 ring-1 ring-indigo-200' :
                  isDupe ? 'border-rose-300' : 'border-slate-200'
                } hover:shadow-sm`}>
                <input type="checkbox" className="shrink-0"
                  checked={isSelected} onChange={() => toggleOne(p.id)} />
                <div className="w-12 h-12 shrink-0 bg-slate-100 rounded overflow-hidden">
                  {p.imageUrls[0] ? (
                    <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">無圖</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate flex items-center gap-1">
                    {isDupe && <span className="text-rose-600 text-[10px] bg-rose-100 px-1 rounded">SKU重複</span>}
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    {p.model && <span className={isDupe ? 'text-rose-600 font-semibold' : ''}>型號：{p.model}</span>}
                    <span>${p.price}</span>
                    <span>庫存 {p.stock}</span>
                    {p.specs.length > 0 && <span>規格 {p.specs.length}</span>}
                    <span>圖 {p.imageUrls.length}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                  <button onClick={() => onEdit(p)}
                    className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded">
                    編輯
                  </button>
                  <button onClick={() => onDuplicate(p)}
                    className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded">
                    複製
                  </button>
                  <button onClick={() => {
                    if (confirm(`確定刪除「${p.name}」？`)) onDelete(p.id);
                  }}
                    className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded">
                    刪除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
