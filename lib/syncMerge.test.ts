import { describe, it, expect } from 'vitest';
import { mergeProducts } from './syncMerge';
import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';

const make = (id: string, model: string, overrides: Partial<Product> = {}): Product => ({
  ...EMPTY_PRODUCT,
  id,
  name: `Item ${model}`,
  model,
  price: 100,
  ...overrides,
});

describe('mergeProducts', () => {
  it('replace mode discards existing', () => {
    const { next, report } = mergeProducts(
      [make('a', 'X'), make('b', 'Y')],
      [make('c', 'Z')],
      'replace',
    );
    expect(next.map(p => p.id)).toEqual(['c']);
    expect(report).toEqual({ total: 1, added: 1, updated: 0, unchanged: 0 });
  });

  it('append mode keeps existing and adds incoming', () => {
    const { next, report } = mergeProducts(
      [make('a', 'X')],
      [make('b', 'X'), make('c', 'Y')],
      'append',
    );
    expect(next.length).toBe(3);
    expect(report.added).toBe(2);
  });

  it('sync mode updates by SKU and preserves existing id', () => {
    const existing = [make('aaa', 'X', { price: 100, name: 'Old' })];
    const incoming = [make('bbb', 'X', { price: 200, name: 'New' })];
    const { next, report } = mergeProducts(existing, incoming, 'sync');
    expect(next.length).toBe(1);
    expect(next[0].id).toBe('aaa');           // id preserved
    expect(next[0].price).toBe(200);          // updated
    expect(next[0].name).toBe('New');         // updated
    expect(report).toEqual({ total: 1, added: 0, updated: 1, unchanged: 0 });
  });

  it('sync mode appends rows whose SKU is not present', () => {
    const { next, report } = mergeProducts(
      [make('a', 'X')],
      [make('b', 'Y')],
      'sync',
    );
    expect(next.length).toBe(2);
    expect(report.added).toBe(1);
    expect(report.updated).toBe(0);
  });

  it('sync mode treats empty SKU as always-append', () => {
    const { next } = mergeProducts(
      [make('a', '')],
      [make('b', '')],
      'sync',
    );
    expect(next.length).toBe(2);
  });

  it('sync mode reports unchanged when fields match', () => {
    const { report } = mergeProducts(
      [make('a', 'X', { price: 100, name: 'Item X' })],
      [make('b', 'X', { price: 100, name: 'Item X' })],
      'sync',
    );
    expect(report.unchanged).toBe(1);
    expect(report.updated).toBe(0);
  });

  it('handles mixed batches in sync mode', () => {
    const existing = [
      make('p1', 'A', { price: 100 }),
      make('p2', 'B', { price: 200 }),
    ];
    const incoming = [
      make('n1', 'A', { price: 150 }),  // updates A
      make('n2', 'C', { price: 300 }),  // adds C
      make('n3', 'B', { price: 200 }),  // unchanged
    ];
    const { next, report } = mergeProducts(existing, incoming, 'sync');
    expect(next.length).toBe(3);
    expect(report).toEqual({ total: 3, added: 1, updated: 1, unchanged: 1 });
  });
});
