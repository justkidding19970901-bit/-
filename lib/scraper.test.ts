import { describe, it, expect } from 'vitest';
import { withRetry, parsePastedJsonLd } from './scraper';

describe('withRetry', () => {
  it('returns immediately on first success', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries up to maxAttempts on failure', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error('temp');
      return 'eventually ok';
    }, 3, 1);
    expect(result).toBe('eventually ok');
    expect(calls).toBe(3);
  });

  it('throws after exhausting all attempts', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new Error('always');
      }, 3, 1),
    ).rejects.toThrow('always');
    expect(calls).toBe(3);
  });
});

describe('parsePastedJsonLd', () => {
  it('rejects empty input', () => {
    expect(() => parsePastedJsonLd('')).toThrow('空');
  });

  it('rejects malformed JSON', () => {
    expect(() => parsePastedJsonLd('not json')).toThrow('JSON');
  });

  it('rejects JSON without a Product type', () => {
    expect(() =>
      parsePastedJsonLd(JSON.stringify({ '@type': 'Article', name: 'x' })),
    ).toThrow('Product');
  });

  it('extracts a basic Product schema', () => {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Test Product',
      description: 'A test',
      image: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      sku: 'SKU-1',
      brand: { name: 'Acme' },
      offers: { price: '199', priceCurrency: 'TWD' },
    };
    const r = parsePastedJsonLd(JSON.stringify(ld));
    expect(r.partial.name).toBe('Test Product');
    expect(r.partial.description).toBe('A test');
    expect(r.partial.model).toBe('SKU-1');
    expect(r.partial.brand).toBe('Acme');
    expect(r.partial.price).toBe(199);
    expect(r.partial.imageUrls?.length).toBe(2);
  });

  it('handles @graph wrapper', () => {
    const ld = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'page' },
        { '@type': 'Product', name: 'wrapped product' },
      ],
    };
    const r = parsePastedJsonLd(JSON.stringify(ld));
    expect(r.partial.name).toBe('wrapped product');
  });

  it('returns warnings when fields are missing', () => {
    const r = parsePastedJsonLd(JSON.stringify({ '@type': 'Product', name: 'x' }));
    expect(r.warnings.some(w => w.includes('價格'))).toBe(true);
    expect(r.warnings.some(w => w.includes('圖片'))).toBe(true);
  });
});
