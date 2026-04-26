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
  }
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
