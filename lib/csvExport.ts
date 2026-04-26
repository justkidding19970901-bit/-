import type { Product, Platform } from '../types';

/**
 * CSV column layouts below approximate the public batch-import templates of
 * each platform. They are based on commonly observed templates for:
 *   - Momo 摩天商城 (店家後台 → 批次商品上傳)
 *   - Yahoo 超級商城 (商品管理 → 批次匯入)
 *   - Pinkoi 賣家中心 (商品 → 批次匯入)
 *
 * Field names and order will drift over time. If a platform rejects the file,
 * grab the latest official template and align column headers to match.
 */

function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(r => r.map(escapeCSV).join(','));
  return '﻿' + [headerLine, ...dataLines].join('\r\n');
}

function specsKV(p: Product, sep = '|'): string {
  return p.specs.map(s => `${s.name}:${s.value}`).join(sep);
}

function img(p: Product, i: number): string {
  return p.imageUrls[i] ?? '';
}

function descAsHtml(text: string): string {
  if (!text) return '';
  if (/<\w+[^>]*>/.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

// =============================================================================
// Momo 摩天商城
// =============================================================================
function buildMomoCSV(products: Product[]): string {
  const headers = [
    '商品自編料號',
    '商品名稱',
    '商品分類碼',
    '品牌',
    '售價',
    '市價',
    '商品成本',
    '庫存量',
    '商品狀態',
    '商品產地',
    '保固期間',
    '商品重量(g)',
    '商品描述',
    '商品規格',
    '主圖網址',
    '附圖1', '附圖2', '附圖3', '附圖4',
    '影片網址',
    '搜尋關鍵字',
  ];
  const rows = products.map(p => [
    p.model || p.id,
    p.name,
    p.momoCategoryCode || '',
    p.brand,
    p.price,
    p.originalPrice ?? p.price,
    p.cost ?? '',
    p.stock,
    p.condition,
    p.origin,
    p.warranty,
    p.weightG || '',
    descAsHtml(p.description),
    specsKV(p),
    img(p, 0), img(p, 1), img(p, 2), img(p, 3), img(p, 4),
    p.videoUrl,
    p.tags,
  ]);
  return rowsToCSV(headers, rows);
}

// =============================================================================
// Yahoo 超級商城
// =============================================================================
function buildYahooCSV(products: Product[]): string {
  const headers = [
    '商品料號',
    '商品名稱',
    '商品分類',
    '商品品牌',
    '售價',
    '市價',
    '庫存量',
    '商品狀態',
    '商品產地',
    '保固期',
    '商品重量(g)',
    '出貨天數',
    '商品說明',
    '規格1名稱', '規格1選項',
    '規格2名稱', '規格2選項',
    '商品主圖',
    '商品圖片2', '商品圖片3', '商品圖片4', '商品圖片5',
    '影片網址',
    '搜尋關鍵字',
  ];
  const rows = products.map(p => {
    const s1 = p.specs[0];
    const s2 = p.specs[1];
    return [
      p.model || p.id,
      p.name,
      p.yahooCategoryCode || p.category || '',
      p.brand,
      p.price,
      p.originalPrice ?? p.price,
      p.stock,
      p.condition,
      p.origin,
      p.warranty,
      p.weightG || '',
      p.shippingDays || 3,
      descAsHtml(p.description),
      s1?.name ?? '', s1?.value ?? '',
      s2?.name ?? '', s2?.value ?? '',
      img(p, 0), img(p, 1), img(p, 2), img(p, 3), img(p, 4),
      p.videoUrl,
      p.tags,
    ];
  });
  return rowsToCSV(headers, rows);
}

// =============================================================================
// Shopee 蝦皮商城
// =============================================================================
function buildShopeeCSV(products: Product[]): string {
  const headers = [
    '商品ID',
    '商品名稱',
    '商品分類',
    '商品品牌',
    '售價',
    '原價',
    '庫存',
    '商品狀況',
    '商品產地',
    '商品重量(g)',
    '商品長(cm)', '商品寬(cm)', '商品高(cm)',
    '預購商品',
    '出貨天數',
    '商品描述',
    '規格1名稱', '規格1選項',
    '規格2名稱', '規格2選項',
    '主圖網址',
    '圖片2', '圖片3', '圖片4', '圖片5', '圖片6', '圖片7', '圖片8', '圖片9',
    '影片網址',
  ];
  const rows = products.map(p => {
    const s1 = p.specs[0];
    const s2 = p.specs[1];
    return [
      p.model || p.id,
      p.name,
      p.shopeeCategoryCode || p.category || '',
      p.brand,
      p.price,
      p.originalPrice ?? p.price,
      p.stock,
      p.condition === '新品' ? '全新' : '二手',
      p.origin,
      p.weightG || '',
      '', '', '',
      '否',
      p.shippingDays || 3,
      p.description,
      s1?.name ?? '', s1?.value ?? '',
      s2?.name ?? '', s2?.value ?? '',
      img(p, 0),
      img(p, 1), img(p, 2), img(p, 3), img(p, 4),
      img(p, 5), img(p, 6), img(p, 7), img(p, 8),
      p.videoUrl,
    ];
  });
  return rowsToCSV(headers, rows);
}

// =============================================================================
// Ruten 露天市集
// =============================================================================
function buildRutenCSV(products: Product[]): string {
  const headers = [
    '物品編號',
    '物品名稱',
    '物品分類',
    '物品品牌',
    '直購價',
    '原價',
    '庫存量',
    '物品狀況',
    '物品產地',
    '物品重量(g)',
    '所在地',
    '出貨方式',
    '物品說明',
    '規格',
    '主圖', '附圖1', '附圖2', '附圖3', '附圖4', '附圖5',
    '影片',
  ];
  const rows = products.map(p => [
    p.model || p.id,
    p.name,
    p.rutenCategoryCode || p.category || '',
    p.brand,
    p.price,
    p.originalPrice ?? p.price,
    p.stock,
    p.condition === '新品' ? '全新品' : '二手',
    p.origin,
    p.weightG || '',
    '台灣',
    '宅配',
    descAsHtml(p.description),
    specsKV(p),
    img(p, 0), img(p, 1), img(p, 2), img(p, 3), img(p, 4), img(p, 5),
    p.videoUrl,
  ]);
  return rowsToCSV(headers, rows);
}

// =============================================================================
// Pinkoi
// =============================================================================
function buildPinkoiCSV(products: Product[]): string {
  const headers = [
    '商品料號(SKU)',
    '商品名稱(中)',
    '商品名稱(英)',
    '商品分類',
    '商品故事',
    '主要關鍵字',
    '售價',
    '限量原價',
    '庫存',
    '出貨天數',
    '商品重量(g)',
    '商品產地',
    '商品狀態',
    '規格名稱', '規格選項',
    '主圖URL',
    '副圖1', '副圖2', '副圖3', '副圖4', '副圖5', '副圖6', '副圖7', '副圖8',
  ];
  const rows = products.map(p => {
    const s = p.specs[0];
    return [
      p.model || p.id,
      p.name,
      '',
      p.pinkoiCategory || p.category || '',
      p.description,
      p.tags,
      p.price,
      p.originalPrice ?? '',
      p.stock,
      p.shippingDays || 3,
      p.weightG || '',
      p.origin,
      p.condition,
      s?.name ?? '', s?.value ?? '',
      img(p, 0),
      img(p, 1), img(p, 2), img(p, 3), img(p, 4),
      img(p, 5), img(p, 6), img(p, 7), img(p, 8),
    ];
  });
  return rowsToCSV(headers, rows);
}

export function buildCSV(platform: Platform, products: Product[]): string {
  switch (platform) {
    case 'momo': return buildMomoCSV(products);
    case 'yahoo': return buildYahooCSV(products);
    case 'pinkoi': return buildPinkoiCSV(products);
    case 'shopee': return buildShopeeCSV(products);
    case 'ruten': return buildRutenCSV(products);
  }
}

// =============================================================================
// Per-product validation (warns about likely-required missing fields)
// =============================================================================

export interface ProductIssue {
  productId: string;
  productName: string;
  level: 'error' | 'warn';
  message: string;
}

function commonIssues(p: Product): ProductIssue[] {
  const issues: ProductIssue[] = [];
  const base = { productId: p.id, productName: p.name || '(未命名商品)' };
  if (!p.name?.trim()) issues.push({ ...base, level: 'error', message: '商品名稱必填' });
  if (!p.price || p.price <= 0) issues.push({ ...base, level: 'error', message: '售價必填且須大於 0' });
  if (!p.imageUrls?.length) issues.push({ ...base, level: 'error', message: '至少需要一張商品圖' });
  if (!p.description?.trim()) issues.push({ ...base, level: 'warn', message: '建議補商品描述（影響轉換率）' });
  if (!p.weightG) issues.push({ ...base, level: 'warn', message: '建議填重量（多家平台計算運費用）' });
  return issues;
}

export function findDuplicateSkus(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const sku = (p.model || '').trim();
    if (!sku) continue;
    const list = groups.get(sku) ?? [];
    list.push(p);
    groups.set(sku, list);
  }
  return new Map(Array.from(groups.entries()).filter(([, v]) => v.length > 1));
}

export function autoFixDuplicateSkus(products: Product[]): Product[] {
  const seen = new Map<string, number>();
  return products.map(p => {
    const original = (p.model || '').trim();
    if (!original) return p;
    const count = seen.get(original) ?? 0;
    seen.set(original, count + 1);
    if (count === 0) return p;
    return { ...p, model: `${original}-${count + 1}` };
  });
}

export function validateForPlatform(platform: Platform, products: Product[]): ProductIssue[] {
  const all: ProductIssue[] = [];
  // Cross-product duplicate SKU check
  const dupes = findDuplicateSkus(products);
  for (const [sku, list] of dupes) {
    for (const p of list) {
      all.push({
        productId: p.id,
        productName: p.name || '(未命名商品)',
        level: 'error',
        message: `SKU 「${sku}」與其他 ${list.length - 1} 筆重複（會匯入失敗）`,
      });
    }
  }
  for (const p of products) {
    const base = { productId: p.id, productName: p.name || '(未命名商品)' };
    all.push(...commonIssues(p));
    if (platform === 'momo' && !p.momoCategoryCode?.trim()) {
      all.push({ ...base, level: 'error', message: 'Momo 分類碼必填（去後台分類樹查）' });
    }
    if (platform === 'yahoo' && !p.yahooCategoryCode?.trim() && !p.category?.trim()) {
      all.push({ ...base, level: 'warn', message: 'Yahoo 建議填分類碼或分類名' });
    }
    if (platform === 'shopee' && !p.shopeeCategoryCode?.trim() && !p.category?.trim()) {
      all.push({ ...base, level: 'warn', message: 'Shopee 建議填分類' });
    }
    if (platform === 'ruten' && !p.rutenCategoryCode?.trim() && !p.category?.trim()) {
      all.push({ ...base, level: 'warn', message: 'Ruten 建議填分類' });
    }
    if (platform === 'pinkoi' && !p.tags?.trim()) {
      all.push({ ...base, level: 'warn', message: 'Pinkoi 建議填關鍵字（影響搜尋曝光）' });
    }
  }
  return all;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PLATFORM_META: Record<Platform, {
  label: string;
  filename: string;
  color: string;
  difficulty: '寬鬆' | '中等' | '嚴格';
  hint: string;
}> = {
  pinkoi: {
    label: 'Pinkoi',
    filename: 'pinkoi_products.csv',
    color: 'bg-rose-600 hover:bg-rose-500',
    difficulty: '寬鬆',
    hint: '欄位最寬鬆，建議先試這家驗證流程',
  },
  shopee: {
    label: '蝦皮 Shopee',
    filename: 'shopee_products.csv',
    color: 'bg-orange-600 hover:bg-orange-500',
    difficulty: '中等',
    hint: '需自行填入分類；變體 ≤ 2 維',
  },
  ruten: {
    label: '露天 Ruten',
    filename: 'ruten_products.csv',
    color: 'bg-yellow-600 hover:bg-yellow-500',
    difficulty: '中等',
    hint: '直購價格式；需指定出貨方式',
  },
  yahoo: {
    label: 'Yahoo 超級商城',
    filename: 'yahoo_products.csv',
    color: 'bg-purple-600 hover:bg-purple-500',
    difficulty: '中等',
    hint: '需自行填入分類碼欄位',
  },
  momo: {
    label: 'Momo 摩天商城',
    filename: 'momo_products.csv',
    color: 'bg-pink-600 hover:bg-pink-500',
    difficulty: '嚴格',
    hint: '必須填分類碼，建議下載官方範本對齊',
  },
};
