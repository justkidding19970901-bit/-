import type { Product, Platform } from '../types';

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
  // Prepend BOM so Excel opens UTF-8 correctly
  return '﻿' + [headerLine, ...dataLines].join('\r\n');
}

function specsToString(p: Product): string {
  return p.specs.map(s => `${s.name}:${s.value}`).join(' / ');
}

function buildMomoCSV(products: Product[]): string {
  const headers = [
    '商品編號', '商品名稱', '品牌', '商品分類',
    '售價', '建議售價', '庫存量', '商品規格',
    '商品描述',
    '主圖網址', '附圖1', '附圖2', '附圖3', '附圖4',
    '影片網址',
  ];
  const rows = products.map(p => {
    const imgs = [0, 1, 2, 3, 4].map(i => p.imageUrls[i] ?? '');
    return [
      p.model || p.id,
      p.name,
      p.brand,
      p.category,
      p.price,
      p.originalPrice ?? p.price,
      p.stock,
      specsToString(p),
      p.description,
      imgs[0], imgs[1], imgs[2], imgs[3], imgs[4],
      p.videoUrl,
    ];
  });
  return rowsToCSV(headers, rows);
}

function buildYahooCSV(products: Product[]): string {
  const headers = [
    '商品編號', '商品名稱', '商品分類', '品牌',
    '售價', '原價', '庫存',
    '商品描述', '商品規格',
    '商品圖片網址', '附加圖片1', '附加圖片2', '附加圖片3',
    '商品影片',
  ];
  const rows = products.map(p => {
    const imgs = [0, 1, 2, 3].map(i => p.imageUrls[i] ?? '');
    return [
      p.model || p.id,
      p.name,
      p.category,
      p.brand,
      p.price,
      p.originalPrice ?? p.price,
      p.stock,
      p.description,
      specsToString(p),
      imgs[0], imgs[1], imgs[2], imgs[3],
      p.videoUrl,
    ];
  });
  return rowsToCSV(headers, rows);
}

function buildPinkoiCSV(products: Product[]): string {
  const headers = [
    'SKU', 'Name', 'Description', 'Price', 'Stock',
    'Category', 'Brand', 'Tags',
    'Spec',
    'MainImage', 'Image2', 'Image3', 'Image4', 'Image5',
  ];
  const rows = products.map(p => {
    const imgs = [0, 1, 2, 3, 4].map(i => p.imageUrls[i] ?? '');
    return [
      p.model || p.id,
      p.name,
      p.description,
      p.price,
      p.stock,
      p.category,
      p.brand,
      p.tags,
      specsToString(p),
      imgs[0], imgs[1], imgs[2], imgs[3], imgs[4],
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

export const PLATFORM_META: Record<Platform, { label: string; filename: string; color: string }> = {
  momo: { label: 'Momo 摩天商城', filename: 'momo_products.csv', color: 'bg-pink-600 hover:bg-pink-500' },
  yahoo: { label: 'Yahoo 商城', filename: 'yahoo_products.csv', color: 'bg-purple-600 hover:bg-purple-500' },
  pinkoi: { label: 'Pinkoi', filename: 'pinkoi_products.csv', color: 'bg-rose-600 hover:bg-rose-500' },
};
