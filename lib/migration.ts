import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { makeId } from './id';

/**
 * Schema versioning for the products stored in localStorage.
 *
 * Old layouts:
 *   v1 (legacy): bare Product[] array, no version marker
 *
 * Current layout (v2):
 *   { version: 2, products: Product[], savedAt: string }
 *
 * Bumping rules:
 *  - New optional fields → no migration needed; EMPTY_PRODUCT spread fills defaults.
 *  - Renamed / split / removed fields → add a step in `migrate()` for that version bump.
 *  - Increment SCHEMA_VERSION + add a case in migrate() and a new test.
 */
export const SCHEMA_VERSION = 2;

interface VersionedSnapshot {
  version: number;
  products: Product[];
  savedAt?: string;
}

function applyDefaults(p: unknown): Product {
  if (!p || typeof p !== 'object') return { ...EMPTY_PRODUCT, id: makeId('mig') };
  const obj = p as Partial<Product>;
  return { ...EMPTY_PRODUCT, ...obj, id: obj.id ?? makeId('mig') } as Product;
}

function migrate(_version: number, products: unknown[]): Product[] {
  let current: unknown[] = products;

  // No v1 → v2 transform needed: that bump only added optional fields, which
  // the applyDefaults pass below already fills in via EMPTY_PRODUCT spread.
  // Future per-version transforms:
  //   if (version < 3) { current = current.map(...rename foo → bar...); }

  return current.map(applyDefaults);
}

export function loadProducts(storageKey: string): Product[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      // legacy bare-array snapshot — treat as v1
      return migrate(1, parsed);
    }
    if (parsed && typeof parsed === 'object' && 'products' in parsed) {
      const snap = parsed as VersionedSnapshot;
      const ver = typeof snap.version === 'number' ? snap.version : 1;
      return migrate(ver, snap.products ?? []);
    }
    return [];
  } catch {
    return [];
  }
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unknown'; message: string };

export function saveProducts(storageKey: string, products: Product[]): SaveResult {
  try {
    const snap: VersionedSnapshot = {
      version: SCHEMA_VERSION,
      products,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(snap));
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Quota name varies across browsers; check both modern names + legacy codes
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014);
    return { ok: false, reason: isQuota ? 'quota' : 'unknown', message };
  }
}

/** Migrates a backup-file payload (also versioned) so old JSON exports still restore. */
export function normalizeBackup(payload: unknown): Product[] {
  if (Array.isArray(payload)) {
    return migrate(1, payload);
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as { version?: number; products?: unknown[] };
    if (Array.isArray(obj.products)) {
      return migrate(obj.version ?? 1, obj.products);
    }
  }
  return [];
}
