import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkImageUrl, checkImageUrls } from './imageCheck';

describe('checkImageUrl', () => {
  beforeEach(() => {
    // Stub Image so onload/onerror are deterministic
    class StubImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      set src(v: string) {
        this._src = v;
        // Resolve next tick so the Promise has subscribed
        setTimeout(() => {
          if (v.includes('good')) this.onload?.();
          else this.onerror?.();
        }, 0);
      }
      get src() { return this._src; }
    }
    // @ts-expect-error stubbing
    globalThis.Image = StubImage;
  });

  it('returns broken for non-http URL', async () => {
    const status = await checkImageUrl('not-a-url');
    expect(status).toBe('broken');
  });

  it('returns ok when image loads', async () => {
    const status = await checkImageUrl('https://example.com/good.jpg');
    expect(status).toBe('ok');
  });

  it('returns broken when image errors', async () => {
    const status = await checkImageUrl('https://example.com/bad.jpg');
    expect(status).toBe('broken');
  });

  it('respects timeout', async () => {
    // Image whose src setter never triggers callbacks
    class HangImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
    }
    // @ts-expect-error stubbing
    globalThis.Image = HangImage;
    const status = await checkImageUrl('https://example.com/hang.jpg', 50);
    expect(status).toBe('broken');
  });
});

describe('checkImageUrls', () => {
  beforeEach(() => {
    class StubImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(v: string) {
        setTimeout(() => {
          if (v.includes('good')) this.onload?.();
          else this.onerror?.();
        }, 0);
      }
    }
    // @ts-expect-error stubbing
    globalThis.Image = StubImage;
  });

  it('reports per-URL status', async () => {
    const map = await checkImageUrls(
      ['https://x/good1.jpg', 'https://x/good2.jpg', 'https://x/bad.jpg'],
      2,
    );
    expect(map.get('https://x/good1.jpg')).toBe('ok');
    expect(map.get('https://x/good2.jpg')).toBe('ok');
    expect(map.get('https://x/bad.jpg')).toBe('broken');
  });

  it('deduplicates URLs', async () => {
    const map = await checkImageUrls(
      ['https://x/good1.jpg', 'https://x/good1.jpg'],
      2,
    );
    expect(map.size).toBe(1);
  });

  it('emits progress callbacks', async () => {
    const onProgress = vi.fn();
    await checkImageUrls(
      ['https://x/good1.jpg', 'https://x/good2.jpg'],
      2,
      onProgress,
    );
    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(lastCall).toEqual([2, 2]);
  });
});
