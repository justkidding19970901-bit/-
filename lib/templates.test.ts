import { describe, it, expect, beforeEach } from 'vitest';
import { addTemplate, applyTemplate, loadTemplates, removeTemplate } from './templates';
import { EMPTY_PRODUCT } from '../types';
import type { Product } from '../types';

const sample: Product = {
  ...EMPTY_PRODUCT,
  id: 'p1',
  name: 'Sample',
  model: 'SKU1',
  price: 100,
  stock: 3,
  brand: 'Acme',
  origin: '日本',
  weightG: 80,
};

describe('templates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(loadTemplates()).toEqual([]);
  });

  it('saves a template stripping per-product fields', () => {
    const tpl = addTemplate('test', sample);
    expect(tpl.payload).not.toHaveProperty('id');
    expect(tpl.payload).not.toHaveProperty('name');
    expect(tpl.payload).not.toHaveProperty('model');
    expect(tpl.payload).not.toHaveProperty('price');
    expect(tpl.payload).not.toHaveProperty('stock');
    // But keeps shared fields
    expect(tpl.payload.brand).toBe('Acme');
    expect(tpl.payload.origin).toBe('日本');
    expect(tpl.payload.weightG).toBe(80);
  });

  it('persists across loads', () => {
    addTemplate('a', sample);
    addTemplate('b', sample);
    expect(loadTemplates().length).toBe(2);
  });

  it('removes by id', () => {
    const tpl = addTemplate('temp', sample);
    removeTemplate(tpl.id);
    expect(loadTemplates()).toEqual([]);
  });

  it('applyTemplate fills missing fields without overriding existing', () => {
    const tpl = addTemplate('t', sample);
    const partial = { brand: 'Custom Brand' };  // user already typed a brand
    const result = applyTemplate(tpl, partial);
    expect(result.brand).toBe('Custom Brand');  // user's value wins
    expect(result.origin).toBe('日本');           // template fills the rest
    expect(result.weightG).toBe(80);
  });
});
