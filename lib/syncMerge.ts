import type { Product } from '../types';

export type ImportMode = 'append' | 'replace' | 'sync';

export interface MergeReport {
  total: number;
  added: number;
  updated: number;
  unchanged: number;
}

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export type DiffEntry =
  | { kind: 'new'; incoming: Product }
  | { kind: 'update'; before: Product; after: Product; changes: FieldChange[] }
  | { kind: 'unchanged'; existing: Product }
  | { kind: 'replace'; incoming: Product }
  | { kind: 'remove'; existing: Product };

const DIFF_FIELDS: (keyof Product)[] = [
  'name', 'description', 'price', 'originalPrice', 'cost', 'stock',
  'model', 'brand', 'category', 'tags', 'weightG', 'condition',
  'origin', 'warranty', 'shippingDays', 'videoUrl',
  'momoCategoryCode', 'yahooCategoryCode', 'pinkoiCategory',
  'shopeeCategoryCode', 'rutenCategoryCode',
];

function diffFields(before: Product, after: Product): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const f of DIFF_FIELDS) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) {
      changes.push({ field: f, from: before[f], to: after[f] });
    }
  }
  // Special: arrays (specs / imageUrls) — show only count delta to keep diff readable
  if (JSON.stringify(before.imageUrls) !== JSON.stringify(after.imageUrls)) {
    changes.push({ field: 'imageUrls', from: `${before.imageUrls.length} 張`, to: `${after.imageUrls.length} 張` });
  }
  if (JSON.stringify(before.specs) !== JSON.stringify(after.specs)) {
    changes.push({ field: 'specs', from: `${before.specs.length} 項`, to: `${after.specs.length} 項` });
  }
  return changes;
}

/**
 * Pure preview that does not mutate state. Used by the UI to show the user
 * exactly what will change before they confirm a sync.
 */
export function previewMerge(
  existing: Product[],
  incoming: Product[],
  mode: ImportMode,
): DiffEntry[] {
  if (mode === 'replace') {
    // Surface BOTH sides so the user can see what's about to vanish, not just
    // what's coming in. mergeProducts() still discards `existing` outright;
    // these `remove` entries are preview-only.
    return [
      ...existing.map(p => ({ kind: 'remove' as const, existing: p })),
      ...incoming.map(p => ({ kind: 'replace' as const, incoming: p })),
    ];
  }
  if (mode === 'append') {
    return incoming.map(p => ({ kind: 'new' as const, incoming: p }));
  }
  const bySku = new Map<string, Product>();
  existing.forEach(p => {
    const k = (p.model || '').trim();
    if (k) bySku.set(k, p);
  });
  return incoming.map(inc => {
    const k = (inc.model || '').trim();
    const before = k ? bySku.get(k) : undefined;
    if (!before) return { kind: 'new' as const, incoming: inc };
    const after: Product = { ...before, ...inc, id: before.id };
    const changes = diffFields(before, after);
    if (changes.length === 0) return { kind: 'unchanged' as const, existing: before };
    return { kind: 'update' as const, before, after, changes };
  });
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
