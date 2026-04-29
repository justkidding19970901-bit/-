import React, { useState } from 'react';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { scrapeProduct, parsePastedJsonLd, type ScrapeResult } from '../lib/scraper';
import { makeId } from '../lib/id';

interface Props {
  onImport: (p: Product) => void;
  onImportMany: (ps: Product[]) => void;
}

const SOURCE_LABEL: Record<ScrapeResult['source'], string> = {
  'shopify-json': 'Shopify 官方商品 JSON（最完整）',
  'json-ld': '結構化資料 (JSON-LD)',
  'open-graph': 'Open Graph 標籤',
  'fallback': '一般 HTML（資料可能不完整）',
};

function makeProduct(partial: Partial<Omit<Product, 'id'>>): Product {
  return {
    ...EMPTY_PRODUCT,
    ...partial,
    id: makeId('p'),
  };
}

export const ScrapeImport: React.FC<Props> = ({ onImport, onImportMany }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handlePasteSubmit = () => {
    setError('');
    setResult(null);
    try {
      const r = parsePastedJsonLd(pasteText, url);
      setResult(r);
      setShowPaste(false);
      setPasteText('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

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
    onImport(makeProduct(result.partial));
    setResult(null);
    setUrl('');
  };

  const handleImportAllVariants = () => {
    if (!result?.variants?.length) return;
    // Stagger ids so list ordering stays stable
    const products = result.variants.map(v => ({
      ...EMPTY_PRODUCT,
      ...v,
      id: makeId('p'),
    }));
    onImportMany(products);
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
          aria-label="商品頁網址"
        />
        <button
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="shrink-0 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 rounded-md"
        >
          {loading ? '抓取中…' : '抓取'}
        </button>
      </div>

      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowPaste(s => !s)}
          className="text-[11px] text-slate-500 hover:text-indigo-700 underline"
          aria-expanded={showPaste}
        >
          📋 貼上 JSON-LD（SPA / 抓取失敗時的後備）
        </button>
      </div>

      {showPaste && (
        <div className="mb-3 border border-slate-300 bg-slate-50 rounded p-3 space-y-2">
          <div className="text-[11px] text-slate-600 leading-relaxed">
            在原網頁按 <kbd className="bg-white border px-1 rounded">Ctrl/⌘+U</kbd> 開啟原始碼，
            搜尋 <code className="bg-white border px-1 rounded">application/ld+json</code>，
            把 <code className="bg-white border px-1 rounded">{`<script>`}</code> 標籤裡面的 JSON 整段複製，貼進下面：
          </div>
          <textarea
            className="w-full h-32 font-mono text-[11px] rounded border border-slate-300 bg-white p-2"
            placeholder='{"@context":"https://schema.org","@type":"Product",...}'
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            aria-label="貼上 JSON-LD 內容"
          />
          <button onClick={handlePasteSubmit} disabled={!pasteText.trim()}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-300 text-white rounded text-xs font-bold">
            從 JSON-LD 解析
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-2 leading-relaxed whitespace-pre-wrap">
          ❌ {error}
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

          <div className="flex flex-col gap-2">
            {result.variants && result.variants.length > 1 && (
              <button
                onClick={handleImportAllVariants}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-md text-sm"
              >
                🪄 展開全部 {result.variants.length} 個變體 → 匯入 {result.variants.length} 筆商品
              </button>
            )}
            <button
              onClick={handleImport}
              className={`w-full font-bold py-2 rounded-md text-sm ${
                result.variants && result.variants.length > 1
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {result.variants && result.variants.length > 1
                ? '只匯入一筆（合併所有變體）'
                : '✓ 匯入到商品清單'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
