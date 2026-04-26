import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ProductSpec } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { sanitizeHtml } from '../lib/htmlSanitize';

interface Props {
  editing: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
  onSplitToVariants: (replacingId: string | null, variants: Product[]) => void;
}

/**
 * Cartesian product of every spec's `/`-separated values. Returns a list of
 * combinations; each combination is a parallel array to `axes` (so axes[i] is
 * the spec name for the i-th element of every combination).
 */
function cartesianFromSpecs(specs: ProductSpec[]): { axes: string[]; combos: string[][] } {
  const axes: string[] = [];
  const lists: string[][] = [];
  for (const s of specs) {
    const values = s.value.split(/[\/／,，]/).map(v => v.trim()).filter(Boolean);
    if (values.length > 0) {
      axes.push(s.name);
      lists.push(values);
    }
  }
  if (!lists.length) return { axes: [], combos: [] };
  const combos = lists.reduce<string[][]>(
    (acc, list) => acc.flatMap(prefix => list.map(v => [...prefix, v])),
    [[]],
  );
  return { axes, combos };
}

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

export const ProductForm: React.FC<Props> = ({ editing, onSave, onCancel, onSplitToVariants }) => {
  const [form, setForm] = useState<Omit<Product, 'id'>>(editing ?? EMPTY_PRODUCT);
  const [imageInput, setImageInput] = useState('');
  const [specName, setSpecName] = useState('');
  const [specValue, setSpecValue] = useState('');

  const variantPreview = useMemo(() => cartesianFromSpecs(form.specs), [form.specs]);
  const canSplit = variantPreview.combos.length > 1;

  const handleSplitVariants = () => {
    if (!canSplit) return;
    if (!form.name.trim()) {
      alert('請先填寫商品名稱');
      return;
    }
    if (!confirm(`將拆出 ${variantPreview.combos.length} 筆獨立商品（每個變體一筆，可分別編輯價格 / 庫存 / SKU）。繼續？`)) {
      return;
    }
    const variants: Product[] = variantPreview.combos.map((combo, idx) => {
      const variantSpecs: ProductSpec[] = variantPreview.axes.map((name, i) => ({
        name, value: combo[i],
      }));
      const suffix = combo.join(' / ');
      const baseModel = form.model || form.name;
      return {
        ...EMPTY_PRODUCT,
        ...form,
        id: `p_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
        name: `${form.name} - ${suffix}`,
        model: `${baseModel}-${combo.map(v => v.replace(/\s+/g, '')).join('-')}`,
        specs: variantSpecs,
      };
    });
    onSplitToVariants(editing?.id ?? null, variants);
  };

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
    <form onSubmit={handleSubmit} className="space-y-5"
          aria-label={editing ? '編輯商品表單' : '新增商品表單'}>
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
            value={specName} onChange={e => setSpecName(e.target.value)}
            aria-label="規格名稱" />
          <input className={inputCls} placeholder="規格值（多值用 / 分隔，例：紅/藍/黑）"
            value={specValue} onChange={e => setSpecValue(e.target.value)}
            aria-label="規格值" />
          <button type="button" onClick={addSpec}
            className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-md">
            加入
          </button>
        </div>
        {form.specs.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="已加入的規格">
            {form.specs.map((s, i) => (
              <li key={i} className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-sm">
                <span>{s.name}: {s.value}</span>
                <button type="button" onClick={() => removeSpec(i)}
                  aria-label={`刪除規格 ${s.name}`}
                  className="text-slate-500 hover:text-red-600">×</button>
              </li>
            ))}
          </ul>
        )}
        {canSplit && (
          <div className="mt-3 border border-violet-200 bg-violet-50 rounded p-3 space-y-2">
            <div className="text-xs font-semibold text-violet-900">
              🪄 規格矩陣偵測 — 將自動產生 {variantPreview.combos.length} 個變體
            </div>
            <div className="overflow-x-auto">
              <table className="text-[11px] text-slate-700 border-collapse">
                <thead>
                  <tr>
                    {variantPreview.axes.map(a => (
                      <th key={a} className="border border-violet-200 bg-violet-100 px-2 py-1 text-left font-semibold">
                        {a}
                      </th>
                    ))}
                    <th className="border border-violet-200 bg-violet-100 px-2 py-1 text-left font-semibold">SKU 預覽</th>
                  </tr>
                </thead>
                <tbody>
                  {variantPreview.combos.slice(0, 8).map((combo, i) => (
                    <tr key={i}>
                      {combo.map((v, j) => (
                        <td key={j} className="border border-violet-100 px-2 py-1">{v}</td>
                      ))}
                      <td className="border border-violet-100 px-2 py-1 font-mono text-slate-500">
                        {(form.model || form.name || 'SKU')}-{combo.map(v => v.replace(/\s+/g, '')).join('-')}
                      </td>
                    </tr>
                  ))}
                  {variantPreview.combos.length > 8 && (
                    <tr>
                      <td colSpan={variantPreview.axes.length + 1}
                          className="border border-violet-100 px-2 py-1 text-slate-500 italic">
                        …還有 {variantPreview.combos.length - 8} 筆
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={handleSplitVariants}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded text-sm">
              🪄 拆成 {variantPreview.combos.length} 筆獨立變體
              {editing ? '（取代目前這筆）' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Images */}
      <div>
        <label className={labelCls}>
          商品圖片網址（可加多張，第一張為主圖。<span className="text-slate-500 font-normal">拖拉可排序</span>）
        </label>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="https://..."
            value={imageInput}
            onChange={e => setImageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
            aria-label="新增圖片網址" />
          <button type="button" onClick={addImage}
            className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-md">
            加入
          </button>
        </div>
        {form.imageUrls.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2"
              aria-label="商品圖片清單，拖拉可排序">
            {form.imageUrls.map((url, i) => (
              <li
                key={`${url}-${i}`}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', String(i));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={e => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData('text/plain'));
                  if (Number.isNaN(from) || from === i) return;
                  const next = [...form.imageUrls];
                  const [moved] = next.splice(from, 1);
                  next.splice(i, 0, moved);
                  update('imageUrls', next);
                }}
                className="relative group border rounded-md overflow-hidden bg-slate-100 aspect-square cursor-move"
                aria-label={`圖片 ${i + 1}${i === 0 ? '（主圖）' : ''}`}
              >
                <img src={url} alt={`商品圖 ${i + 1}`} className="w-full h-full object-cover pointer-events-none"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <div className="absolute top-1 left-1 flex gap-1">
                  <button type="button"
                    aria-label="向前移動"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...form.imageUrls];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      update('imageUrls', next);
                    }}
                    className="bg-black/60 text-white text-xs rounded w-5 h-5 leading-5 text-center opacity-0 group-hover:opacity-100 disabled:opacity-20">‹</button>
                  <button type="button"
                    aria-label="向後移動"
                    disabled={i === form.imageUrls.length - 1}
                    onClick={() => {
                      const next = [...form.imageUrls];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      update('imageUrls', next);
                    }}
                    className="bg-black/60 text-white text-xs rounded w-5 h-5 leading-5 text-center opacity-0 group-hover:opacity-100 disabled:opacity-20">›</button>
                </div>
                <button type="button" onClick={() => removeImage(i)}
                  aria-label={`刪除圖片 ${i + 1}`}
                  className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-6 h-6 leading-6 text-center opacity-0 group-hover:opacity-100">×</button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[10px] px-1.5 rounded">主圖</span>
                )}
                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded">{i + 1}</span>
              </li>
            ))}
          </ul>
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
