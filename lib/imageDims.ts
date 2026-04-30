/**
 * 圖片尺寸快取 + 並發掃描器。
 *
 * Pinkoi 規格：商品圖單邊寬度需 ≥ 1000px。要在匯出前過濾掉不合的 URL,
 * 但 store-assets CDN 不在 URL 裡帶尺寸,只能逐張 load 進 <img> 看
 * naturalWidth/Height。掃完一次後存到 IndexedDB,後續匯出秒過。
 */

const DB_NAME = 'product_migration';
const STORE = 'kv';
// 升版到 v2 是因為 Pinkoi 圖片過濾從只看尺寸擴展到也看
// 檔案大小(<10MB) + Content-Type(image/jpeg|png),需要重新掃描所有 URL。
const DIMS_KEY = 'imageDims_v2';
const SCAN_TIMEOUT_MS = 15000;
const PINKOI_IMG_MIN_SIDE_PX = 1000;
const PINKOI_IMG_MAX_BYTES = 10 * 1024 * 1024;

export interface DimEntry {
  w: number;
  h: number;
  /** HEAD response 的 Content-Length,bytes */
  bytes?: number;
  /** HEAD response 的 Content-Type,主要為了揪 Shopify CDN 內容協商偷塞 webp */
  contentType?: string;
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

function loadImageDim(url: string): Promise<{ w: number; h: number; failed?: boolean }> {
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const finish = (v: { w: number; h: number; failed?: boolean }) => {
      if (settled) return;
      settled = true;
      img.onload = img.onerror = null;
      resolve(v);
    };
    img.onload = () => finish({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => finish({ w: 0, h: 0, failed: true });
    setTimeout(() => finish({ w: 0, h: 0, failed: true }), SCAN_TIMEOUT_MS);
    img.src = url;
  });
}

async function headProbe(url: string): Promise<{ bytes?: number; contentType?: string }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SCAN_TIMEOUT_MS);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return {};
    const len = res.headers.get('content-length');
    const ct = res.headers.get('content-type') || undefined;
    return {
      bytes: len ? parseInt(len, 10) : undefined,
      contentType: ct,
    };
  } catch {
    return {};
  }
}

async function probeImageDim(url: string): Promise<DimEntry> {
  // 並行跑 <img> load + HEAD,兩個結果合一
  const [dim, head] = await Promise.all([loadImageDim(url), headProbe(url)]);
  if (dim.failed) return { w: 0, h: 0, failedAt: Date.now() };
  return { w: dim.w, h: dim.h, bytes: head.bytes, contentType: head.contentType };
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

/**
 * Pinkoi 圖片過濾總規則:
 *   ① URL 結尾 jpg/jpeg/png(由 pinkoiImageList 處理,這邊不重複)
 *   ② 單邊 ≥ 1000px
 *   ③ 檔案 < 10 MB
 *   ④ 實際 Content-Type 是 image/jpeg 或 image/png
 *      (擋 Shopify CDN 偷塞 webp:URL 寫 .jpeg 但 server 回 webp)
 *   ⑤ 解析度 72 dpi:略,web image 預設都是 72,讀 EXIF/IHDR 成本太高
 *
 * Bytes 與 contentType 為空(代表 HEAD 失敗或 CORS 擋)時保守判定:
 * 沒能驗證到的就視為不可用,寧可留空讓使用者後台補。
 */
export function isPinkoiImageOk(entry: DimEntry | undefined): boolean {
  if (!entry || entry.failedAt) return false;
  if (Math.min(entry.w, entry.h) < PINKOI_IMG_MIN_SIDE_PX) return false;
  if (entry.bytes === undefined || entry.bytes >= PINKOI_IMG_MAX_BYTES) return false;
  if (!entry.contentType || !/^image\/(jpeg|png)\b/i.test(entry.contentType)) return false;
  return true;
}
