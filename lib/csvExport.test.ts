import { describe, it, expect } from 'vitest';
import {
  buildCSV, validateForPlatform, findDuplicateSkus, autoFixDuplicateSkus,
} from './csvExport';
import { previewMerge } from './syncMerge';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    ...EMPTY_PRODUCT,
    id: 'p1',
    name: 'Test',
    price: 100,
    stock: 5,
    imageUrls: ['https://example.com/a.jpg'],
    ...overrides,
  };
}

describe('buildCSV', () => {
  it('emits a UTF-8 BOM', () => {
    const csv = buildCSV('pinkoi', [makeProduct({ id: 'p1' })]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('quotes fields containing commas', () => {
    const csv = buildCSV('pinkoi', [makeProduct({ name: 'Hello, World' })]);
    expect(csv).toContain('"Hello, World"');
  });

  it('escapes embedded double quotes', () => {
    const csv = buildCSV('pinkoi', [makeProduct({ name: 'a "b" c' })]);
    expect(csv).toContain('"a ""b"" c"');
  });

  it('builds Momo CSV with all expected headers', () => {
    const csv = buildCSV('momo', [makeProduct({})]);
    const headerLine = csv.replace(/^﻿/, '').split('\r\n')[0];
    expect(headerLine).toContain('商品自編料號');
    expect(headerLine).toContain('商品分類碼');
    expect(headerLine).toContain('主圖網址');
  });

  it('builds Shopee CSV with all expected headers', () => {
    const csv = buildCSV('shopee', [makeProduct({})]);
    const headerLine = csv.replace(/^﻿/, '').split('\r\n')[0];
    expect(headerLine).toContain('商品ID');
    expect(headerLine).toContain('規格1名稱');
  });

  it('produces one data row per product', () => {
    const csv = buildCSV('pinkoi', [
      makeProduct({ id: 'p1', name: 'A' }),
      makeProduct({ id: 'p2', name: 'B' }),
    ]);
    expect(csv.replace(/^﻿/, '').split('\r\n').length).toBe(3); // header + 2
  });
});

describe('validateForPlatform', () => {
  it('flags missing name as error', () => {
    const issues = validateForPlatform('pinkoi', [makeProduct({ name: '' })]);
    expect(issues.some(i => i.level === 'error' && i.message.includes('名稱'))).toBe(true);
  });

  it('flags missing price as error', () => {
    const issues = validateForPlatform('pinkoi', [makeProduct({ price: 0 })]);
    expect(issues.some(i => i.level === 'error' && i.message.includes('售價'))).toBe(true);
  });

  it('flags missing image as error', () => {
    const issues = validateForPlatform('pinkoi', [makeProduct({ imageUrls: [] })]);
    expect(issues.some(i => i.level === 'error' && i.message.includes('商品圖'))).toBe(true);
  });

  it('flags missing Momo category code', () => {
    const issues = validateForPlatform('momo', [makeProduct({ momoCategoryCode: '' })]);
    expect(issues.some(i => i.message.includes('Momo 分類碼'))).toBe(true);
  });

  it('passes a fully-populated product for Pinkoi', () => {
    const issues = validateForPlatform('pinkoi', [
      makeProduct({
        name: 'X', price: 100, imageUrls: ['x.jpg'],
        description: 'Y', weightG: 50, tags: 't',
      }),
    ]);
    expect(issues.filter(i => i.level === 'error')).toEqual([]);
  });

  it('flags duplicate SKUs as errors for every involved product', () => {
    const issues = validateForPlatform('pinkoi', [
      makeProduct({ id: 'a', model: 'SKU1' }),
      makeProduct({ id: 'b', model: 'SKU1' }),
      makeProduct({ id: 'c', model: 'SKU2' }),
    ]);
    const skuErrors = issues.filter(i => i.message.includes('SKU') && i.level === 'error');
    expect(skuErrors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('previewMerge', () => {
  it('marks every row as new in append mode', () => {
    const diffs = previewMerge([], [makeProduct({ model: 'X' })], 'append');
    expect(diffs.every(d => d.kind === 'new')).toBe(true);
  });

  it('surfaces both sides in replace mode (existing as remove, incoming as replace)', () => {
    const diffs = previewMerge(
      [makeProduct({ id: 'a' }), makeProduct({ id: 'a2' })],
      [makeProduct({ id: 'b' })],
      'replace',
    );
    expect(diffs.length).toBe(3);
    expect(diffs.filter(d => d.kind === 'remove').length).toBe(2);
    expect(diffs.filter(d => d.kind === 'replace').length).toBe(1);
  });

  it('flags new SKUs as new in sync mode', () => {
    const diffs = previewMerge(
      [makeProduct({ model: 'A' })],
      [makeProduct({ model: 'B' })],
      'sync',
    );
    expect(diffs[0].kind).toBe('new');
  });

  it('reports field-level changes for matched SKUs', () => {
    const diffs = previewMerge(
      [makeProduct({ model: 'X', price: 100, stock: 5 })],
      [makeProduct({ model: 'X', price: 200, stock: 5 })],
      'sync',
    );
    expect(diffs[0].kind).toBe('update');
    if (diffs[0].kind === 'update') {
      const priceChange = diffs[0].changes.find(c => c.field === 'price');
      expect(priceChange?.from).toBe(100);
      expect(priceChange?.to).toBe(200);
    }
  });

  it('marks identical inputs as unchanged', () => {
    const diffs = previewMerge(
      [makeProduct({ model: 'X', price: 100 })],
      [makeProduct({ model: 'X', price: 100 })],
      'sync',
    );
    expect(diffs[0].kind).toBe('unchanged');
  });
});

describe('findDuplicateSkus + autoFixDuplicateSkus', () => {
  it('groups duplicates by SKU', () => {
    const dupes = findDuplicateSkus([
      makeProduct({ id: 'a', model: 'X' }),
      makeProduct({ id: 'b', model: 'X' }),
      makeProduct({ id: 'c', model: 'Y' }),
    ]);
    expect(dupes.size).toBe(1);
    expect(dupes.get('X')!.length).toBe(2);
  });

  it('ignores empty SKUs', () => {
    const dupes = findDuplicateSkus([
      makeProduct({ id: 'a', model: '' }),
      makeProduct({ id: 'b', model: '' }),
    ]);
    expect(dupes.size).toBe(0);
  });

  it('auto-fixes by appending suffix from second occurrence onward', () => {
    const fixed = autoFixDuplicateSkus([
      makeProduct({ id: 'a', model: 'X' }),
      makeProduct({ id: 'b', model: 'X' }),
      makeProduct({ id: 'c', model: 'X' }),
      makeProduct({ id: 'd', model: 'Y' }),
    ]);
    expect(fixed.map(p => p.model)).toEqual(['X', 'X-2', 'X-3', 'Y']);
  });
});
