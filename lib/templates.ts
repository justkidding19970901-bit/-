import type { Product } from '../types';
import { makeId } from './id';

const TEMPLATE_KEY = 'product_templates_v1';

/** A reusable subset of Product fields. We deliberately drop id, name, model
 * (those are per-product) and price/stock (typically vary per-item). */
export type TemplatePayload = Omit<Product, 'id' | 'name' | 'model' | 'price' | 'stock'>;

export interface ProductTemplate {
  id: string;
  name: string;
  payload: TemplatePayload;
  createdAt: string;
}

export function loadTemplates(): ProductTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(list: ProductTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(list));
  } catch {
    /* best effort */
  }
}

export function addTemplate(name: string, source: Product): ProductTemplate {
  const list = loadTemplates();
  // strip per-product fields
  const { id: _id, name: _n, model: _m, price: _p, stock: _s, ...rest } = source;
  const tpl: ProductTemplate = {
    id: makeId('tpl'),
    name: name.trim() || `範本 ${list.length + 1}`,
    payload: rest as TemplatePayload,
    createdAt: new Date().toISOString(),
  };
  saveTemplates([tpl, ...list]);
  return tpl;
}

export function removeTemplate(id: string): void {
  saveTemplates(loadTemplates().filter(t => t.id !== id));
}

/** Applies a template to a partial product, preserving any explicit fields the
 * caller already set. */
export function applyTemplate(
  tpl: ProductTemplate,
  current: Partial<Product>,
): Partial<Product> {
  return {
    ...tpl.payload,
    ...current, // current values win — user-edited fields aren't overwritten
  };
}
