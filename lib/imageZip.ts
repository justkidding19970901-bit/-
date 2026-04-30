import type { Product } from '../types';

const PROXIES: ((url: string) => string)[] = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

function safeFolderName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').trim();
  return cleaned.slice(0, 64) || fallback;
}

function extFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.([a-zA-Z0-9]+)(?:$|[?#])/);
    if (m) {
      const e = m[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(e)) return e;
    }
  } catch {/* ignore */}
  return 'jpg';
}

async function fetchBinary(url: string): Promise<Blob | null> {
  // Try direct fetch first (image CDN often allows it)
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) return await r.blob();
  } catch {/* fall through */}
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy(url));
      if (r.ok) return await r.blob();
    } catch {/* try next */}
  }
  return null;
}

export interface ZipProgress {
  done: number;
  total: number;
  failed: number;
  currentLabel: string;
}

export interface ZipResult {
  success: number;
  failed: number;
  failedUrls: string[];
}

/**
 * Downloads every image URL across `products`, packs them into a zip with
 * one folder per product, and triggers a download. Concurrency 4. Reports
 * progress via the optional callback.
 */
export async function downloadProductImagesAsZip(
  products: Product[],
  onProgress?: (p: ZipProgress) => void,
): Promise<ZipResult> {
  // Lazy-load JSZip to keep the main bundle small
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const tasks: { folder: string; idx: number; url: string }[] = [];
  for (const product of products) {
    const folder = safeFolderName(
      product.model || product.name,
      `product_${product.id}`,
    );
    product.imageUrls.forEach((url, i) => {
      if (url && /^https?:\/\//i.test(url)) {
        tasks.push({ folder, idx: i, url });
      }
    });
  }

  const result: ZipResult = { success: 0, failed: 0, failedUrls: [] };
  let cursor = 0;
  let done = 0;
  const CONCURRENCY = 4;

  const worker = async () => {
    while (cursor < tasks.length) {
      const myIdx = cursor++;
      const task = tasks[myIdx];
      onProgress?.({
        done,
        total: tasks.length,
        failed: result.failed,
        currentLabel: `${task.folder}/${task.idx + 1}`,
      });
      const blob = await fetchBinary(task.url);
      if (blob) {
        const filename = `${task.folder}/${String(task.idx + 1).padStart(2, '0')}.${extFromUrl(task.url)}`;
        zip.file(filename, blob);
        result.success++;
      } else {
        result.failed++;
        result.failedUrls.push(task.url);
      }
      done++;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, tasks.length || 1) }, () => worker()),
  );

  if (result.success > 0) {
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    a.download = `product-images-${ts}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  onProgress?.({
    done: tasks.length,
    total: tasks.length,
    failed: result.failed,
    currentLabel: '完成',
  });
  return result;
}
