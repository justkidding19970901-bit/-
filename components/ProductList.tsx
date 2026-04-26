import React, { useMemo, useState } from 'react';
import type { Product } from '../types';

interface Props {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
}

export const ProductList: React.FC<Props> = ({ products, onEdit, onDelete, onDuplicate }) => {
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

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
        還沒有商品，從上方抓取或表單新增
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="🔍 搜尋商品名稱 / SKU / 品牌 / 標籤"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <span className="text-xs text-slate-500 shrink-0">
          {filtered.length}/{products.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          沒有符合「{query}」的商品
        </div>
      ) : (
        <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(p => (
            <li key={p.id}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition">
              <div className="w-14 h-14 shrink-0 bg-slate-100 rounded overflow-hidden">
                {p.imageUrls[0] ? (
                  <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">無圖</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                  {p.model && <span>型號：{p.model}</span>}
                  <span>價格：${p.price}</span>
                  <span>庫存：{p.stock}</span>
                  {p.specs.length > 0 && <span>規格 {p.specs.length}</span>}
                  <span>圖片 {p.imageUrls.length}</span>
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
          ))}
        </ul>
      )}
    </div>
  );
};
