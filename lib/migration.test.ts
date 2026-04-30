import { describe, it, expect, beforeEach } from 'vitest';
import { loadProducts, saveProducts, normalizeBackup, SCHEMA_VERSION } from './migration';

const KEY = 'test_products';

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty list when storage is empty', () => {
    expect(loadProducts(KEY)).toEqual([]);
  });

  it('migrates legacy bare-array snapshot (v1) to current schema', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'a', name: 'X', price: 100 },
    ]));
    const products = loadProducts(KEY);
    expect(products.length).toBe(1);
    expect(products[0].name).toBe('X');
    // EMPTY_PRODUCT defaults filled in
    expect(products[0].condition).toBe('新品');
    expect(products[0].origin).toBe('台灣');
  });

  it('reads versioned snapshot directly', () => {
    saveProducts(KEY, [{
      id: 'a', name: 'Y', price: 50, description: '', stock: 0, model: '',
      brand: '', category: '', specs: [], imageUrls: [], videoUrl: '',
      tags: '', weightG: 0, condition: '新品', origin: '台灣',
      warranty: '', shippingDays: 3,
    } as any]);
    const products = loadProducts(KEY);
    expect(products.length).toBe(1);
    expect(products[0].name).toBe('Y');
  });

  it('saveProducts writes version marker', () => {
    saveProducts(KEY, []);
    const raw = localStorage.getItem(KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(SCHEMA_VERSION);
  });

  it('normalizeBackup accepts legacy bare array', () => {
    const out = normalizeBackup([{ id: 'a', name: 'Z', price: 1 }]);
    expect(out.length).toBe(1);
    expect(out[0].name).toBe('Z');
  });

  it('normalizeBackup accepts versioned payload', () => {
    const out = normalizeBackup({
      version: 2,
      products: [{ id: 'a', name: 'A', price: 1 }],
    });
    expect(out.length).toBe(1);
  });

  it('normalizeBackup returns empty for garbage', () => {
    expect(normalizeBackup(null)).toEqual([]);
    expect(normalizeBackup({ foo: 'bar' })).toEqual([]);
  });

  it('returns empty when storage value is malformed', () => {
    localStorage.setItem(KEY, '{"garbage');
    expect(loadProducts(KEY)).toEqual([]);
  });
});
