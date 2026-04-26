export type ImageStatus = 'unknown' | 'ok' | 'broken';

/**
 * Loads the URL through an `Image` element so cross-origin requests aren't
 * blocked by CORS the way `fetch` would be. Resolves with 'ok' if the browser
 * decoded the bitmap, 'broken' on error / timeout / non-http URL.
 */
export function checkImageUrl(url: string, timeoutMs = 8000): Promise<ImageStatus> {
  return new Promise(resolve => {
    if (!url || !/^https?:\/\//i.test(url)) {
      resolve('broken');
      return;
    }
    const img = new Image();
    let done = false;
    const finish = (status: ImageStatus) => {
      if (done) return;
      done = true;
      resolve(status);
    };
    img.onload = () => finish('ok');
    img.onerror = () => finish('broken');
    setTimeout(() => finish('broken'), timeoutMs);
    img.src = url;
  });
}

export async function checkImageUrls(
  urls: string[],
  concurrency = 6,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, ImageStatus>> {
  const result = new Map<string, ImageStatus>();
  const unique = Array.from(new Set(urls)).filter(Boolean);
  let cursor = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (cursor < unique.length) {
      const i = cursor++;
      const url = unique[i];
      const status = await checkImageUrl(url);
      result.set(url, status);
      done++;
      onProgress?.(done, unique.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()),
  );
  return result;
}
