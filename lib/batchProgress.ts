import type { Product } from '../types';

const KEY = 'batch_progress_v1';

export interface BatchProgress {
  collectionUrl: string;
  origin: string;
  allHandles: string[];
  doneIndices: number[];
  failedHandles: string[];
  collected: Product[];
  expandVariants: boolean;
  startedAt: string;
}

export function saveBatchProgress(p: BatchProgress | null): void {
  try {
    if (!p) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, JSON.stringify(p));
    }
  } catch {
    /* quota or privacy mode — best effort */
  }
}

export function loadBatchProgress(): BatchProgress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BatchProgress;
    if (!parsed?.allHandles?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
