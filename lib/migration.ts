import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';

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
  if (!p || typeof p !== 'object') return { ...EMPTY_PRODUCT, id: `mig_${Math.random()}` };
  const obj = p as Partial<Product>;
  return { ...EMPTY_PRODUCT, ...obj, id: obj.id ?? `mig_${Math.random()}` } as Product;
}

function migrate(version: number, products: unknown[]): Product[] {
  let current: unknown[] = products;

  // v1 → v2: introduced shopeeCategoryCode / rutenCategoryCode / weightG /
  // condition / origin / warranty / shippingDays — defaults handled by spread.
  if (version < 2) {
    current = current.map(applyDefaults);
  }

  // Future:
  // if (version < 3) { ...rename foo → bar... }

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

export function saveProducts(storageKey: string, products: Product[]): void {
  try {
    const snap: VersionedSnapshot = {
      version: SCHEMA_VERSION,
      products,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(snap));
  } catch {
    /* quota / private mode — best effort */
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
