/**
 * 圖片尺寸快取 + 並發掃描器。
 *
 * Pinkoi 規格：商品圖單邊寬度需 ≥ 1000px。要在匯出前過濾掉不合的 URL,
 * 但 store-assets CDN 不在 URL 裡帶尺寸,只能逐張 load 進 <img> 看
 * naturalWidth/Height。掃完一次後存到 IndexedDB,後續匯出秒過。
 */

const DB_NAME = 'product_migration';
const STORE = 'kv';
const DIMS_KEY = 'imageDims';
const SCAN_TIMEOUT_MS = 15000;

export interface DimEntry {
  w: number;
  h: number;
  /** 載入失敗(404、CORS、timeout 等)時的 timestamp;有值代表這張不可用 */
  failedAt?: number;
}

let cached: Map<string, DimEntry> | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
}

async function readCacheFromIDB(): Promise<Map<string, DimEntry>> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(DIMS_KEY);
    const data = await new Promise<unknown>((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    if (Array.isArray(data)) return new Map(data as [string, DimEntry][]);
  } catch {
    /* fall through */
  }
  return new Map();
}

async function writeCacheToIDB(map: Map<string, DimEntry>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(Array.from(map.entries()), DIMS_KEY);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error ?? new Error('aborted'));
    });
  } catch {
    /* best effort - quota or denied */
  }
}

export async function loadDimCache(): Promise<Map<string, DimEntry>> {
  if (!cached) cached = await readCacheFromIDB();
  return cached;
}

export async function clearDimCache(): Promise<void> {
  cached = new Map();
  await writeCacheToIDB(cached);
}

function probeImageDim(url: string): Promise<DimEntry> {
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const finish = (entry: DimEntry) => {
      if (settled) return;
      settled = true;
      img.onload = img.onerror = null;
      resolve(entry);
    };
    img.onload = () => finish({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => finish({ w: 0, h: 0, failedAt: Date.now() });
    setTimeout(() => finish({ w: 0, h: 0, failedAt: Date.now() }), SCAN_TIMEOUT_MS);
    img.src = url;
  });
}

export interface ScanProgress {
  done: number;
  total: number;
  cached: number;
}

/**
 * 掃一組 URL 的尺寸,寫進 cache。已在 cache 裡的不重抓。
 * concurrency 預設 50 並行,onProgress 每完成一張呼一次。
 */
export async function scanImageDims(
  urls: Iterable<string>,
  onProgress?: (p: ScanProgress) => void,
  concurrency = 50,
): Promise<Map<string, DimEntry>> {
  const cache = await loadDimCache();
  const uniq = Array.from(new Set(urls));
  const todo = uniq.filter(u => !cache.has(u));
  const cachedHits = uniq.length - todo.length;

  if (todo.length === 0) {
    onProgress?.({ done: 0, total: 0, cached: cachedHits });
    return cache;
  }

  let cursor = 0;
  let done = 0;
  let sinceFlush = 0;

  const workerCount = Math.min(concurrency, todo.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < todo.length) {
      const idx = cursor++;
      const url = todo[idx];
      const entry = await probeImageDim(url);
      cache.set(url, entry);
      done++;
      sinceFlush++;
      onProgress?.({ done, total: todo.length, cached: cachedHits });
      if (sinceFlush >= 500) {
        sinceFlush = 0;
        await writeCacheToIDB(cache);
      }
    }
  });
  await Promise.all(workers);
  await writeCacheToIDB(cache);
  return cache;
}

export function isPinkoiImageOk(entry: DimEntry | undefined): boolean {
  if (!entry || entry.failedAt) return false;
  return Math.min(entry.w, entry.h) >= 1000;
}
