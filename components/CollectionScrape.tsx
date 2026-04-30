import React, { useEffect, useRef, useState } from 'react';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { scanShopifyCollection, scrapeProduct, buildProductUrlFromHandle, withRetry } from '../lib/scraper';
import { loadBatchProgress, saveBatchProgress, type BatchProgress } from '../lib/batchProgress';
import { showConfirm } from '../lib/dialog';
import { makeId } from '../lib/id';

interface Props {
  onImportMany: (ps: Product[]) => void;
}

interface RuntimeProgress {
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
  const [progress, setProgress] = useState<RuntimeProgress | null>(null);
  const [resumable, setResumable] = useState<BatchProgress | null>(null);
  const stopFlag = useRef(false);

  useEffect(() => {
    setResumable(loadBatchProgress());
  }, []);

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

  const runScrape = async (initial: BatchProgress) => {
    stopFlag.current = false;
    const failedHandles = [...initial.failedHandles];
    const collected = [...initial.collected];
    const doneIndices = [...initial.doneIndices];
    const doneSet = new Set(doneIndices);

    setProgress({
      total: initial.allHandles.length,
      done: doneIndices.length,
      failed: failedHandles.length,
      currentLabel: '準備…',
    });

    // Build queue of remaining indices
    const pending: number[] = [];
    for (let i = 0; i < initial.allHandles.length; i++) {
      if (!doneSet.has(i)) pending.push(i);
    }

    let cursor = 0;
    let saveCounter = 0;
    const CONCURRENCY = 4;

    const worker = async () => {
      while (!stopFlag.current) {
        const myIdx = cursor++;
        if (myIdx >= pending.length) return;
        const i = pending[myIdx];
        const handle = initial.allHandles[i];
        setProgress(prev => ({
          total: initial.allHandles.length,
          done: doneIndices.length,
          failed: failedHandles.length,
          currentLabel: handle,
        }));
        try {
          const productUrl = buildProductUrlFromHandle(initial.origin, handle);
          const r = await withRetry(() => scrapeProduct(productUrl), 3, 700);
          if (initial.expandVariants && r.variants && r.variants.length > 1) {
            for (const variant of r.variants) {
              collected.push({
                ...EMPTY_PRODUCT,
                ...variant,
                id: makeId('p'),
              });
            }
          } else {
            collected.push({
              ...EMPTY_PRODUCT,
              ...r.partial,
              id: makeId('p'),
            });
          }
        } catch {
          failedHandles.push(handle);
        }
        doneIndices.push(i);
        doneSet.add(i);
        saveCounter++;
        if (saveCounter % 3 === 0) {
          saveBatchProgress({ ...initial, doneIndices, failedHandles, collected });
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length || 1) }, () => worker()),
    );

    // Final progress snapshot before continuing to completion logic below
    saveBatchProgress({ ...initial, doneIndices, failedHandles, collected });

    if (stopFlag.current) {
      saveBatchProgress({ ...initial, doneIndices, failedHandles, collected });
      setProgress({
        total: initial.allHandles.length,
        done: doneIndices.length,
        failed: failedHandles.length,
        currentLabel: '已停止 — 可從上方「繼續上次抓取」恢復',
      });
      setResumable(loadBatchProgress());
      return;
    }

    onImportMany(collected);
    if (failedHandles.length > 0) {
      // Keep progress + handles + origin around so user can retry just the
      // failed ones; clear collected (already imported above).
      saveBatchProgress({
        ...initial, doneIndices, failedHandles, collected: [],
      });
      setResumable(loadBatchProgress());
      setProgress({
        total: initial.allHandles.length,
        done: doneIndices.length,
        failed: failedHandles.length,
        currentLabel: `完成（${failedHandles.length} 筆失敗，可重試）`,
      });
      return;
    }

    saveBatchProgress(null);
    setResumable(null);
    setProgress({
      total: initial.allHandles.length,
      done: doneIndices.length,
      failed: failedHandles.length,
      currentLabel: '全部完成',
    });
    setTimeout(() => {
      reset();
      setUrl('');
    }, 1500);
  };

  const handleRetryFailed = async () => {
    if (!resumable?.failedHandles.length) return;
    const failed = resumable.failedHandles;
    // Re-run only the failed handles by treating them as a fresh batch
    const retryBatch: BatchProgress = {
      collectionUrl: resumable.collectionUrl,
      origin: resumable.origin,
      allHandles: failed,
      doneIndices: [],
      failedHandles: [],
      collected: [],
      expandVariants: resumable.expandVariants,
      startedAt: new Date().toISOString(),
    };
    saveBatchProgress(retryBatch);
    setResumable(retryBatch);
    setHandles(failed);
    setOrigin(resumable.origin);
    setExpandVariants(resumable.expandVariants);
    await runScrape(retryBatch);
  };

  const handleStartScrape = async () => {
    if (!handles.length) return;
    const initial: BatchProgress = {
      collectionUrl: url,
      origin,
      allHandles: handles,
      doneIndices: [],
      failedHandles: [],
      collected: [],
      expandVariants,
      startedAt: new Date().toISOString(),
    };
    saveBatchProgress(initial);
    setResumable(initial);
    await runScrape(initial);
  };

  const handleResume = async () => {
    if (!resumable) return;
    setUrl(resumable.collectionUrl);
    setOrigin(resumable.origin);
    setHandles(resumable.allHandles);
    setExpandVariants(resumable.expandVariants);
    await runScrape(resumable);
  };

  const handleDiscardResume = async () => {
    const ok = await showConfirm({
      title: '放棄上次未完成的抓取？',
      body: '已抓的資料也會被丟掉。',
      confirmText: '放棄',
      destructive: true,
    });
    if (!ok) return;
    saveBatchProgress(null);
    setResumable(null);
  };

  const handleStop = () => {
    stopFlag.current = true;
  };

  const isRunning = !!progress && progress.done < progress.total;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-800">🗂️ 整批抓取（Shopify 分類頁）</h2>
        <span className="text-[11px] text-slate-400">含失敗重試 / 斷點續傳</span>
      </div>

      {resumable && !isRunning && (
        <div className="mb-3 border border-amber-300 bg-amber-50 rounded p-3 space-y-2 text-xs">
          <div className="font-semibold text-amber-900">
            📌 偵測到上次未完成的抓取
          </div>
          <div className="text-slate-700">
            已抓 {resumable.doneIndices.length} / {resumable.allHandles.length}，
            收集 {resumable.collected.length} 筆，
            失敗 <span className={resumable.failedHandles.length > 0 ? 'text-rose-700 font-bold' : ''}>
              {resumable.failedHandles.length}
            </span> 個
          </div>
          {resumable.failedHandles.length > 0 && (
            <details className="text-[11px] text-slate-600">
              <summary className="cursor-pointer hover:text-slate-900">看失敗清單</summary>
              <ul className="mt-1 list-disc pl-4 max-h-24 overflow-y-auto">
                {resumable.failedHandles.slice(0, 20).map((h, i) => (
                  <li key={i} className="truncate font-mono">{h}</li>
                ))}
                {resumable.failedHandles.length > 20 && (
                  <li className="italic text-slate-500">…還有 {resumable.failedHandles.length - 20} 筆</li>
                )}
              </ul>
            </details>
          )}
          <div className="flex gap-2 flex-wrap">
            {resumable.doneIndices.length < resumable.allHandles.length && (
              <button onClick={handleResume}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold">
                ▶ 繼續上次抓取
              </button>
            )}
            {resumable.failedHandles.length > 0 && (
              <button onClick={handleRetryFailed}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold">
                🔁 只重試失敗的 {resumable.failedHandles.length} 筆
              </button>
            )}
            <button onClick={handleDiscardResume}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded">
              放棄
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        貼分類頁網址（例：<code className="text-slate-700">/collections/xxx</code>），
        系統會列出全部商品，每筆失敗自動重試 3 次，關分頁也能續抓。
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="url"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="https://your-shop.com/collections/xxx"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={scanning || isRunning}
        />
        <button
          onClick={handleScan}
          disabled={scanning || !url.trim() || isRunning}
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
            預估時間：約 {Math.max(1, Math.ceil((handles.length * 0.5) / 60))} 分鐘
            （並行 4 條同時抓） · 每筆失敗重試 3 次 · 進度自動儲存
          </div>
          <button
            onClick={handleStartScrape}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-md text-sm"
          >
            🚀 開始抓取 {handles.length} 個商品
          </button>
        </div>
      )}

      {progress && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded p-3 space-y-2"
             role="status" aria-live="polite"
             aria-label={`抓取進度 ${progress.done} / ${progress.total}`}>
          <div className="flex justify-between text-xs text-slate-700">
            <span className="font-semibold">{progress.done} / {progress.total}</span>
            {progress.failed > 0 && (
              <span className="text-amber-700">失敗 {progress.failed}（已重試 3 次仍失敗）</span>
            )}
          </div>
          <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {isRunning ? '正在處理：' : ''}{progress.currentLabel}
          </div>
          {isRunning && (
            <button onClick={handleStop}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1.5 rounded">
              ⏸ 停止（可稍後續抓）
            </button>
          )}
        </div>
      )}
    </div>
  );
};
