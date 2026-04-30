import type { Product } from '../types';
import { SCHEMA_VERSION, loadProducts as loadProductsLegacy, type SaveResult } from './migration';

export type { SaveResult } from './migration';
export { normalizeBackup } from './migration';

const DB_NAME = 'product_migration';
const DB_VERSION = 1;
const STORE = 'kv';
const PRODUCTS_KEY = 'products';

interface VersionedSnapshot {
  version: number;
  products: Product[];
  savedAt?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  return dbPromise;
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDB().then(
    db =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbPut(key: string, value: unknown): Promise<void> {
  return openDB().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
      }),
  );
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014)
  );
}

/**
 * Load products from IndexedDB. On first run after the localStorage→IDB
 * upgrade, transparently migrates any existing localStorage snapshot into
 * IDB and clears the old key.
 */
export async function loadProductsAsync(legacyStorageKey: string): Promise<Product[]> {
  try {
    const snap = await idbGet<VersionedSnapshot>(PRODUCTS_KEY);
    if (snap && Array.isArray(snap.products)) return snap.products;
  } catch {
    /* fall through to localStorage fallback */
  }

  const legacy = loadProductsLegacy(legacyStorageKey);
  if (legacy.length) {
    try {
      await idbPut(PRODUCTS_KEY, {
        version: SCHEMA_VERSION,
        products: legacy,
        savedAt: new Date().toISOString(),
      } satisfies VersionedSnapshot);
      try {
        localStorage.removeItem(legacyStorageKey);
      } catch {
        /* best effort */
      }
    } catch {
      /* migration failed; keep legacy in localStorage as fallback */
    }
  }
  return legacy;
}

export async function saveProductsAsync(products: Product[]): Promise<SaveResult> {
  try {
    const snap: VersionedSnapshot = {
      version: SCHEMA_VERSION,
      products,
      savedAt: new Date().toISOString(),
    };
    await idbPut(PRODUCTS_KEY, snap);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: isQuotaError(err) ? 'quota' : 'unknown', message };
  }
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  percent: number;
}

/** Best-effort wrapper around `navigator.storage.estimate()`. */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!quota) return null;
    return { usage, quota, percent: usage / quota };
  } catch {
    return null;
  }
}
