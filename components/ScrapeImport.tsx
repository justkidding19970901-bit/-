import React, { useState } from 'react';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { scrapeProduct, type ScrapeResult } from '../lib/scraper';

interface Props {
  onImport: (p: Product) => void;
}

const SOURCE_LABEL: Record<ScrapeResult['source'], string> = {
  'shopify-json': 'Shopify 官方商品 JSON（最完整）',
  'json-ld': '結構化資料 (JSON-LD)',
  'open-graph': 'Open Graph 標籤',
  'fallback': '一般 HTML（資料可能不完整）',
};

export const ScrapeImport: React.FC<Props> = ({ onImport }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const handleFetch = async () => {
    setError('');
    setResult(null);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const r = await scrapeProduct(url);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!result) return;
    const product: Product = {
      ...EMPTY_PRODUCT,
      ...result.partial,
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    onImport(product);
    setResult(null);
    setUrl('');
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-800">🔗 從網址抓取商品</h2>
        <span className="text-[11px] text-slate-400">公開頁面 · 不支援需登入頁</span>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        貼上自架站商品頁網址，自動抓取名稱、描述、圖片、價格。
        抓取後會先預覽，確認沒問題再匯入清單。
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="url"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="https://your-shop.com/products/abc"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } }}
          disabled={loading}
        />
        <button
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="shrink-0 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 rounded-md"
        >
          {loading ? '抓取中…' : '抓取'}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-2 leading-relaxed">
          ❌ {error}
          <div className="text-slate-500 mt-1">
            可能原因：網址錯誤 / 該頁需登入 / 公開代理被該站封鎖。可改用「手動輸入」表單。
          </div>
        </div>
      )}

      {result && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">
              來源：<span className="font-semibold">{SOURCE_LABEL[result.source]}</span>
            </span>
            <button
              onClick={() => setResult(null)}
              className="text-slate-500 hover:text-red-600"
            >
              清除預覽
            </button>
          </div>

          {result.warnings.length > 0 && (
            <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 list-disc pl-4">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          <div className="text-sm space-y-1">
            <div><span className="text-slate-500">名稱：</span><span className="font-semibold">{result.partial.name || '（無）'}</span></div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
              {result.partial.price ? <span>💰 ${result.partial.price}</span> : <span className="text-amber-700">💰 未抓到價格</span>}
              {result.partial.brand && <span>🏷️ {result.partial.brand}</span>}
              {result.partial.model && <span>#️⃣ {result.partial.model}</span>}
              {result.partial.category && <span>📁 {result.partial.category}</span>}
            </div>
            {result.partial.description && (
              <div className="text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">
                {result.partial.description}
              </div>
            )}
          </div>

          {(result.partial.imageUrls?.length ?? 0) > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {result.partial.imageUrls!.map((u, i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded overflow-hidden border">
                  <img src={u} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleImport}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-md text-sm"
          >
            ✓ 匯入到商品清單
          </button>
        </div>
      )}
    </div>
  );
};
