import React, { useState, useEffect } from 'react';
import type { Product, ProductSpec } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { sanitizeHtml } from '../lib/htmlSanitize';

interface Props {
  editing: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

export const ProductForm: React.FC<Props> = ({ editing, onSave, onCancel }) => {
  const [form, setForm] = useState<Omit<Product, 'id'>>(editing ?? EMPTY_PRODUCT);
  const [imageInput, setImageInput] = useState('');
  const [specName, setSpecName] = useState('');
  const [specValue, setSpecValue] = useState('');

  useEffect(() => {
    if (editing) {
      const { id, ...rest } = editing;
      setForm(rest);
    } else {
      setForm(EMPTY_PRODUCT);
    }
  }, [editing]);

  const update = <K extends keyof Omit<Product, 'id'>>(key: K, value: Omit<Product, 'id'>[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    update('imageUrls', [...form.imageUrls, url]);
    setImageInput('');
  };

  const removeImage = (i: number) => {
    update('imageUrls', form.imageUrls.filter((_, idx) => idx !== i));
  };

  const addSpec = () => {
    if (!specName.trim()) return;
    const spec: ProductSpec = { name: specName.trim(), value: specValue.trim() };
    update('specs', [...form.specs, spec]);
    setSpecName('');
    setSpecValue('');
  };

  const removeSpec = (i: number) => {
    update('specs', form.specs.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('請填寫商品名稱');
      return;
    }
    const id = editing?.id ?? `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    onSave({ ...form, id });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800">
        {editing ? '編輯商品' : '新增商品'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>商品名稱 *</label>
          <input className={inputCls} value={form.name}
            onChange={e => update('name', e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>型號 / SKU</label>
          <input className={inputCls} value={form.model}
            onChange={e => update('model', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>品牌</label>
          <input className={inputCls} value={form.brand}
            onChange={e => update('brand', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>分類</label>
          <input className={inputCls} value={form.category}
            onChange={e => update('category', e.target.value)}
            placeholder="例：女裝 / 上衣" />
        </div>
        <div>
          <label className={labelCls}>售價</label>
          <input type="number" min={0} className={inputCls} value={form.price || ''}
            onChange={e => update('price', Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>原價（可選）</label>
          <input type="number" min={0} className={inputCls}
            value={form.originalPrice ?? ''}
            onChange={e => update('originalPrice', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div>
          <label className={labelCls}>庫存數量</label>
          <input type="number" min={0} className={inputCls} value={form.stock || ''}
            onChange={e => update('stock', Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>標籤 / Tags（用逗號分隔）</label>
          <input className={inputCls} value={form.tags}
            onChange={e => update('tags', e.target.value)}
            placeholder="例：手工,文創,禮物" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className={labelCls}>商品描述 / 內文</label>
          <button type="button"
            onClick={() => update('description', sanitizeHtml(form.description))}
            className="text-[11px] text-amber-700 hover:text-amber-900 underline">
            清理 HTML（移除危險標籤 / 內嵌樣式）
          </button>
        </div>
        <textarea className={inputCls + ' min-h-[120px]'} value={form.description}
          onChange={e => update('description', e.target.value)} />
      </div>

      {/* Specs */}
      <div>
        <label className={labelCls}>規格（顏色、尺寸、材質等）</label>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="規格名（例：顏色）"
            value={specName} onChange={e => setSpecName(e.target.value)} />
          <input className={inputCls} placeholder="規格值（例：黑色）"
            value={specValue} onChange={e => setSpecValue(e.target.value)} />
          <button type="button" onClick={addSpec}
            className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-md">
            加入
          </button>
        </div>
        {form.specs.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {form.specs.map((s, i) => (
              <li key={i} className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-sm">
                <span>{s.name}: {s.value}</span>
                <button type="button" onClick={() => removeSpec(i)}
                  className="text-slate-500 hover:text-red-600">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Images */}
      <div>
        <label className={labelCls}>商品圖片網址（可加多張，第一張為主圖）</label>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="https://..."
            value={imageInput}
            onChange={e => setImageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }} />
          <button type="button" onClick={addImage}
            className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-md">
            加入
          </button>
        </div>
        {form.imageUrls.length > 0 && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {form.imageUrls.map((url, i) => (
              <div key={i} className="relative group border rounded-md overflow-hidden bg-slate-100 aspect-square">
                <img src={url} alt={`${i + 1}`} className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-6 h-6 leading-6 text-center opacity-0 group-hover:opacity-100">×</button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[10px] px-1.5 rounded">主圖</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>影片網址（YouTube 等）</label>
        <input className={inputCls} value={form.videoUrl}
          onChange={e => update('videoUrl', e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..." />
      </div>

      {/* Advanced fields - collapsible */}
      <details className="border border-slate-200 rounded-md">
        <summary className="cursor-pointer px-3 py-2 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          進階欄位（重量 / 產地 / 保固 / 平台分類碼）
        </summary>
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>商品狀態</label>
            <select className={inputCls} value={form.condition}
              onChange={e => update('condition', e.target.value as '新品' | '二手')}>
              <option value="新品">新品</option>
              <option value="二手">二手</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>商品產地</label>
            <input className={inputCls} value={form.origin}
              onChange={e => update('origin', e.target.value)}
              placeholder="台灣 / 中國 / 日本…" />
          </div>
          <div>
            <label className={labelCls}>商品重量（公克 g）</label>
            <input type="number" min={0} className={inputCls} value={form.weightG || ''}
              onChange={e => update('weightG', Number(e.target.value))}
              placeholder="例如手機殼約 50" />
          </div>
          <div>
            <label className={labelCls}>出貨天數</label>
            <input type="number" min={1} className={inputCls} value={form.shippingDays || ''}
              onChange={e => update('shippingDays', Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>保固期間</label>
            <input className={inputCls} value={form.warranty}
              onChange={e => update('warranty', e.target.value)}
              placeholder="例：30 天 / 不適用" />
          </div>
          <div>
            <label className={labelCls}>商品成本（內部用，可空）</label>
            <input type="number" min={0} className={inputCls} value={form.cost ?? ''}
              onChange={e => update('cost', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className={labelCls}>Momo 分類碼</label>
            <input className={inputCls} value={form.momoCategoryCode ?? ''}
              onChange={e => update('momoCategoryCode', e.target.value)}
              placeholder="例：SC0410100040（從 Momo 後台取得）" />
          </div>
          <div>
            <label className={labelCls}>Yahoo 分類碼</label>
            <input className={inputCls} value={form.yahooCategoryCode ?? ''}
              onChange={e => update('yahooCategoryCode', e.target.value)}
              placeholder="從 Yahoo 後台分類表取得" />
          </div>
          <div>
            <label className={labelCls}>Pinkoi 分類</label>
            <input className={inputCls} value={form.pinkoiCategory ?? ''}
              onChange={e => update('pinkoiCategory', e.target.value)}
              placeholder="例：飾品配件 > 手機殼" />
          </div>
          <div>
            <label className={labelCls}>Shopee 分類碼</label>
            <input className={inputCls} value={form.shopeeCategoryCode ?? ''}
              onChange={e => update('shopeeCategoryCode', e.target.value)}
              placeholder="從 Shopee 賣家中心取得" />
          </div>
          <div>
            <label className={labelCls}>Ruten 分類碼</label>
            <input className={inputCls} value={form.rutenCategoryCode ?? ''}
              onChange={e => update('rutenCategoryCode', e.target.value)}
              placeholder="從露天賣家中心取得" />
          </div>
        </div>
      </details>

      <div className="flex gap-2 pt-2">
        <button type="submit"
          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md">
          {editing ? '儲存修改' : '新增商品'}
        </button>
        {editing && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-md">
            取消
          </button>
        )}
      </div>
    </form>
  );
};
