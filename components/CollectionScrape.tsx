import React, { useState } from 'react';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { scanShopifyCollection, scrapeProduct, buildProductUrlFromHandle } from '../lib/scraper';

interface Props {
  onImportMany: (ps: Product[]) => void;
}

interface Progress {
  total: number;
  done: number;
  failed: number;
  currentLabel: string;
}

export const CollectionScrape: React.FC<Props> = ({ onImportMany }) => {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [handles, setHandles] = useState<string[]>([]);
  const [origin, setOrigin] = useState('');
  const [expandVariants, setExpandVariants] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);

  const reset = () => {
    setHandles([]);
    setOrigin('');
    setError('');
    setProgress(null);
  };

  const handleScan = async () => {
    reset();
    setScanning(true);
    try {
      const r = await scanShopifyCollection(url);
      setHandles(r.productHandles);
      setOrigin(r.origin);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const handleScrapeAll = async () => {
    if (!handles.length) return;
    const collected: Product[] = [];
    let failed = 0;
    setProgress({ total: handles.length, done: 0, failed: 0, currentLabel: '準備…' });
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      const productUrl = buildProductUrlFromHandle(origin, handle);
      setProgress({ total: handles.length, done: i, failed, currentLabel: handle });
      try {
        const r = await scrapeProduct(productUrl);
        if (expandVariants && r.variants && r.variants.length > 1) {
          for (let v = 0; v < r.variants.length; v++) {
            collected.push({
              ...EMPTY_PRODUCT,
              ...r.variants[v],
              id: `p_${Date.now()}_${i}_${v}_${Math.random().toString(36).slice(2, 5)}`,
            });
          }
        } else {
          collected.push({
            ...EMPTY_PRODUCT,
            ...r.partial,
            id: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
          });
        }
      } catch {
        failed++;
      }
      // Be polite to the proxy and origin
      await new Promise(res => setTimeout(res, 350));
    }
    setProgress({ total: handles.length, done: handles.length, failed, currentLabel: '完成' });
    onImportMany(collected);
    setTimeout(() => {
      reset();
      setUrl('');
    }, 1500);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-800">🗂️ 整批抓取（Shopify 分類頁）</h2>
        <span className="text-[11px] text-slate-400">一次搬一整個分類</span>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        貼分類頁網址（例：<code className="text-slate-700">/collections/xxx</code>），
        系統會列出該分類所有商品，再一個一個抓取。
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="url"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="https://your-shop.com/collections/xxx"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={scanning || !!progress}
        />
        <button
          onClick={handleScan}
          disabled={scanning || !url.trim() || !!progress}
          className="shrink-0 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 rounded-md"
        >
          {scanning ? '掃描中…' : '預掃描'}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-2">
          ❌ {error}
        </div>
      )}

      {handles.length > 0 && !progress && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded p-3 space-y-2">
          <div className="text-sm font-semibold text-slate-800">
            找到 {handles.length} 件商品
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={expandVariants}
              onChange={e => setExpandVariants(e.target.checked)}
              className="rounded"
            />
            自動展開所有變體（多型號商品會拆成多筆）— 推薦開啟
          </label>
          <div className="text-[11px] text-slate-500">
            預估時間：約 {Math.ceil((handles.length * 1.5) / 60)} 分鐘
            （每個商品延遲 350ms 避免被擋）
          </div>
          <button
            onClick={handleScrapeAll}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-md text-sm"
          >
            🚀 開始抓取 {handles.length} 個商品
          </button>
        </div>
      )}

      {progress && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded p-3 space-y-2">
          <div className="flex justify-between text-xs text-slate-700">
            <span className="font-semibold">{progress.done} / {progress.total}</span>
            {progress.failed > 0 && <span className="text-amber-700">失敗 {progress.failed}</span>}
          </div>
          <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            正在處理：{progress.currentLabel}
          </div>
        </div>
      )}
    </div>
  );
};
