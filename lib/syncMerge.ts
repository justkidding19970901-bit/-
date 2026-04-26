import type { Product } from '../types';

export type ImportMode = 'append' | 'replace' | 'sync';

export interface MergeReport {
  total: number;
  added: number;
  updated: number;
  unchanged: number;
}

/**
 * Merges incoming products into the existing list according to mode:
 *  - 'append': always add as new rows
 *  - 'replace': discard existing list, use only incoming
 *  - 'sync': match by SKU (model). If incoming SKU exists in `existing`,
 *    overlay the new fields onto the existing record (preserving the
 *    existing id). If SKU is empty or not found, append.
 *
 * Returns the merged list plus a summary report so the UI can tell the
 * user "added 3 / updated 2 / unchanged 0".
 */
export function mergeProducts(
  existing: Product[],
  incoming: Product[],
  mode: ImportMode,
): { next: Product[]; report: MergeReport } {
  if (mode === 'replace') {
    return {
      next: incoming,
      report: { total: incoming.length, added: incoming.length, updated: 0, unchanged: 0 },
    };
  }
  if (mode === 'append') {
    return {
      next: [...existing, ...incoming],
      report: { total: incoming.length, added: incoming.length, updated: 0, unchanged: 0 },
    };
  }

  // 'sync' — match by trimmed non-empty SKU
  const bySku = new Map<string, number>();
  existing.forEach((p, i) => {
    const k = (p.model || '').trim();
    if (k) bySku.set(k, i);
  });

  const next = [...existing];
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const inc of incoming) {
    const k = (inc.model || '').trim();
    const idx = k ? bySku.get(k) : undefined;
    if (idx !== undefined) {
      const before = next[idx];
      const merged: Product = { ...before, ...inc, id: before.id };
      // Only mark as "updated" if anything actually changed
      if (JSON.stringify(merged) !== JSON.stringify(before)) {
        next[idx] = merged;
        updated++;
      } else {
        unchanged++;
      }
    } else {
      next.push(inc);
      added++;
    }
  }

  return { next, report: { total: incoming.length, added, updated, unchanged } };
}
