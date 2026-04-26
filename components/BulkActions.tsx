import React, { useState } from 'react';
import type { Product } from '../types';
import { autoFixDuplicateSkus, findDuplicateSkus } from '../lib/csvExport';
import { sanitizeHtml } from '../lib/htmlSanitize';
import { checkImageUrls, type ImageStatus } from '../lib/imageCheck';
import { downloadProductImagesAsZip, type ZipProgress } from '../lib/imageZip';

interface Props {
  products: Product[];
  selectedIds: Set<string>;
  onUpdate: (next: Product[]) => void;
  onClearSelection: () => void;
}

type PriceMode = 'set' | 'addPercent' | 'subPercent' | 'addFixed' | 'subFixed';
type TagMode = 'replace' | 'append';

interface ImageReport {
  total: number;
  broken: { productId: string; productName: string; url: string }[];
}

export const BulkActions: React.FC<Props> = ({ products, selectedIds, onUpdate, onClearSelection }) => {
  const [open, setOpen] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>('addPercent');
  const [priceValue, setPriceValue] = useState<number>(10);
  const [tagMode, setTagMode] = useState<TagMode>('append');
  const [tagValue, setTagValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);
  const [imageReport, setImageReport] = useState<ImageReport | null>(null);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [zipResult, setZipResult] = useState<{ success: number; failed: number } | null>(null);

  const targetIds: Set<string> = selectedIds.size > 0 ? selectedIds : new Set(products.map(p => p.id));
  const targetCount = targetIds.size;

  const updateSelected = (mutator: (p: Product) => Product) => {
    onUpdate(products.map(p => (targetIds.has(p.id) ? mutator(p) : p)));
  };

  const applyPrice = () => {
    if (!priceValue && priceMode !== 'set') return;
    updateSelected(p => {
      let next = p.price;
      switch (priceMode) {
        case 'set':       next = priceValue; break;
        case 'addPercent': next = Math.round(p.price * (1 + priceValue / 100)); break;
        case 'subPercent': next = Math.round(p.price * (1 - priceValue / 100)); break;
        case 'addFixed':   next = p.price + priceValue; break;
        case 'subFixed':   next = Math.max(0, p.price - priceValue); break;
      }
      return { ...p, price: Math.max(0, next) };
    });
  };

  const applyTags = () => {
    if (!tagValue.trim()) return;
    updateSelected(p => {
      if (tagMode === 'replace') return { ...p, tags: tagValue };
      const merged = [p.tags, tagValue].filter(Boolean).join(', ');
      return { ...p, tags: merged };
    });
    setTagValue('');
  };

  const applyCategory = () => {
    if (!categoryValue.trim()) return;
    updateSelected(p => ({ ...p, category: categoryValue }));
    setCategoryValue('');
  };

  const applyDelete = () => {
    if (!confirm(`確定刪除選取的 ${targetCount} 筆商品？無法復原（建議先下載備份檔）`)) return;
    onUpdate(products.filter(p => !targetIds.has(p.id)));
    onClearSelection();
  };

  const applyDuplicate = () => {
    const clones = products
      .filter(p => targetIds.has(p.id))
      .map(p => ({
        ...p,
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: `${p.name} (複本)`,
        model: p.model ? `${p.model}-COPY` : '',
      }));
    onUpdate([...products, ...clones]);
  };

  const applyFixSkus = () => {
    const dupes = findDuplicateSkus(products);
    if (dupes.size === 0) {
      alert('沒有重複的 SKU');
      return;
    }
    onUpdate(autoFixDuplicateSkus(products));
    alert(`已修復 ${dupes.size} 組重複 SKU（自動加上 -2、-3 後綴）`);
  };

  const applySanitize = () => {
    updateSelected(p => ({ ...p, description: sanitizeHtml(p.description) }));
  };

  const runImageZip = async () => {
    setZipResult(null);
    const targetProducts = products.filter(p => targetIds.has(p.id));
    const total = targetProducts.reduce((acc, p) => acc + p.imageUrls.length, 0);
    if (!total) {
      alert('沒有圖片可下載');
      return;
    }
    setZipProgress({ done: 0, total, failed: 0, currentLabel: '準備…' });
    try {
      const r = await downloadProductImagesAsZip(targetProducts, p => setZipProgress(p));
      setZipResult({ success: r.success, failed: r.failed });
    } catch (err) {
      alert(`打包失敗：${(err as Error).message}`);
    } finally {
      setZipProgress(null);
    }
  };

  const runImageCheck = async () => {
    setImageReport(null);
    const targetProducts = products.filter(p => targetIds.has(p.id));
    const allUrls = targetProducts.flatMap(p => p.imageUrls);
    if (!allUrls.length) {
      setImageReport({ total: 0, broken: [] });
      return;
    }
    setImageProgress({ done: 0, total: allUrls.length });
    const statuses = await checkImageUrls(allUrls, 6, (done, total) => {
      setImageProgress({ done, total });
    });
    const broken: ImageReport['broken'] = [];
    for (const p of targetProducts) {
      for (const u of p.imageUrls) {
        if ((statuses.get(u) as ImageStatus) === 'broken') {
          broken.push({ productId: p.id, productName: p.name, url: u });
        }
      }
    }
    setImageReport({ total: allUrls.length, broken });
    setImageProgress(null);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-100 text-sm"
      >
        <span className="font-bold text-slate-800">
          🛠️ 批次操作
          <span className="ml-2 text-xs font-normal text-slate-600">
            （目標：{selectedIds.size > 0 ? `已選 ${targetCount} 筆` : `全部 ${targetCount} 筆`}）
          </span>
        </span>
        <span className="text-slate-400 text-xs">{open ? '收起 ▲' : '展開 ▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 text-sm">
          {/* Price */}
          <div className="border border-slate-200 rounded p-3 space-y-2">
            <div className="font-semibold text-slate-700 text-xs">💰 批次調整售價</div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={priceMode} onChange={e => setPriceMode(e.target.value as PriceMode)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm">
                <option value="addPercent">原價 +N %（給平台抽成）</option>
                <option value="subPercent">原價 -N %</option>
                <option value="addFixed">原價 + N 元</option>
                <option value="subFixed">原價 - N 元</option>
                <option value="set">統一設為 N 元</option>
              </select>
              <input type="number" value={priceValue}
                onChange={e => setPriceValue(Number(e.target.value))}
                className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-sm" />
              <button onClick={applyPrice}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold">
                套用到 {targetCount} 筆
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="border border-slate-200 rounded p-3 space-y-2">
            <div className="font-semibold text-slate-700 text-xs">🏷️ 批次標籤</div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={tagMode} onChange={e => setTagMode(e.target.value as TagMode)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm">
                <option value="append">追加</option>
                <option value="replace">取代</option>
              </select>
              <input type="text" value={tagValue}
                onChange={e => setTagValue(e.target.value)}
                placeholder="例：手機殼,iPhone,文創"
                className="flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm" />
              <button onClick={applyTags}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold">
                套用
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="border border-slate-200 rounded p-3 space-y-2">
            <div className="font-semibold text-slate-700 text-xs">📁 批次分類</div>
            <div className="flex gap-2 flex-wrap items-center">
              <input type="text" value={categoryValue}
                onChange={e => setCategoryValue(e.target.value)}
                placeholder="例：3C / 手機殼"
                className="flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm" />
              <button onClick={applyCategory}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold">
                套用
              </button>
            </div>
          </div>

          {/* Quality fixes */}
          <div className="border border-slate-200 rounded p-3 space-y-2">
            <div className="font-semibold text-slate-700 text-xs">✨ 修復 / 清理</div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={applyFixSkus}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold">
                修復重複 SKU
              </button>
              <button onClick={applySanitize}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold">
                清理 HTML 描述（{targetCount} 筆）
              </button>
              <button onClick={runImageCheck}
                disabled={!!imageProgress}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white rounded text-xs font-bold">
                {imageProgress ? `檢查圖片中 ${imageProgress.done}/${imageProgress.total}` : '檢查圖片連結'}
              </button>
              <button onClick={runImageZip}
                disabled={!!zipProgress}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 text-white rounded text-xs font-bold">
                {zipProgress ? `打包中 ${zipProgress.done}/${zipProgress.total}` : '📦 圖片打包成 zip'}
              </button>
            </div>
            {zipProgress && (
              <div className="text-[11px] text-slate-600 mt-1">
                正在抓：{zipProgress.currentLabel}
                {zipProgress.failed > 0 && (
                  <span className="text-amber-700 ml-2">失敗 {zipProgress.failed}</span>
                )}
              </div>
            )}
            {zipResult && (
              <div className="text-xs mt-2 p-2 rounded bg-slate-50 border border-slate-200">
                {zipResult.failed === 0 ? (
                  <span className="text-emerald-700">
                    ✓ 已打包 {zipResult.success} 張圖片，瀏覽器自動下載 .zip
                  </span>
                ) : (
                  <span className="text-amber-700">
                    部分成功：成功 {zipResult.success} 張、失敗 {zipResult.failed} 張（被 CDN 擋）
                  </span>
                )}
              </div>
            )}
            {imageReport && (
              <div className="text-xs mt-2 p-2 rounded bg-slate-50 border border-slate-200">
                {imageReport.broken.length === 0 ? (
                  <span className="text-emerald-700">✓ {imageReport.total} 張圖片全部正常</span>
                ) : (
                  <div className="space-y-1">
                    <div className="text-rose-700 font-semibold">
                      共 {imageReport.total} 張，{imageReport.broken.length} 張失效
                    </div>
                    <ul className="max-h-32 overflow-y-auto list-disc pl-4 text-rose-600">
                      {imageReport.broken.slice(0, 20).map((b, i) => (
                        <li key={i} className="truncate">
                          <span className="font-medium">{b.productName}</span>：
                          <span className="text-slate-500">{b.url}</span>
                        </li>
                      ))}
                      {imageReport.broken.length > 20 && (
                        <li className="text-slate-500">…還有 {imageReport.broken.length - 20} 張</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Destructive */}
          <div className="border border-rose-200 rounded p-3 space-y-2">
            <div className="font-semibold text-rose-700 text-xs">⚠️ 危險操作</div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={applyDuplicate}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-800 rounded text-xs font-bold">
                複製選取（{selectedIds.size}）
              </button>
              <button onClick={applyDelete}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded text-xs font-bold">
                刪除選取（{selectedIds.size}）
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              「複製 / 刪除」必須先勾選商品；其他操作未勾選時會套用到全部。
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
