import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { detectEasyStore, easyStoreToProducts } from './easyStoreAdapter';
import { makeId } from './id';

/**
 * Maps a raw header string from the user's spreadsheet to a Product field.
 * Lower-cased and stripped of whitespace before lookup. We support both
 * Chinese and English headers since Excel exports vary wildly.
 */
const HEADER_ALIASES: Record<keyof Omit<Product, 'id'>, string[]> = {
  name: ['name', 'product name', '商品名稱', '商品名', '名稱', '品名'],
  description: ['description', 'desc', '商品描述', '描述', '商品說明', '說明', '商品故事', '商品內文', '內文'],
  price: ['price', '售價', '價格', '直購價', '商品售價'],
  originalPrice: ['original price', 'compare at price', 'msrp', '市價', '原價', '建議售價', '限量原價'],
  cost: ['cost', '成本', '商品成本'],
  stock: ['stock', 'inventory', 'qty', 'quantity', '庫存', '庫存量', '庫存數量', '數量'],
  model: ['sku', 'model', '型號', '商品料號', '料號', '商品自編料號', '物品編號', '商品ID'],
  brand: ['brand', 'vendor', '品牌', '商品品牌'],
  category: ['category', '分類', '商品分類', '物品分類'],
  momoCategoryCode: ['momo category', 'momo 分類碼', 'momo分類碼'],
  yahooCategoryCode: ['yahoo category', 'yahoo 分類碼', 'yahoo分類碼'],
  pinkoiCategory: ['pinkoi category', 'pinkoi 分類', 'pinkoi分類'],
  shopeeCategoryCode: ['shopee category', 'shopee 分類碼', 'shopee分類碼'],
  rutenCategoryCode: ['ruten category', 'ruten 分類碼', '露天分類碼'],
  specs: ['specs', '規格', '規格表'],
  imageUrls: ['images', 'image', 'image url', 'image urls', '主圖', '主圖網址', '圖片', '圖片網址', '商品圖片', '商品圖片網址'],
  videoUrl: ['video', 'video url', '影片', '影片網址', '商品影片'],
  tags: ['tags', '標籤', '主要關鍵字', '關鍵字', '搜尋關鍵字'],
  weightG: ['weight', 'weight (g)', '重量', '商品重量', '商品重量(g)', '物品重量(g)'],
  condition: ['condition', '商品狀態', '物品狀況', '商品狀況'],
  origin: ['origin', 'country', '產地', '商品產地', '物品產地'],
  warranty: ['warranty', '保固', '保固期', '保固期間'],
  shippingDays: ['shipping days', '出貨天數', '出貨日'],
};

function normHeader(h: string): string {
  return String(h).toLowerCase().replace(/\s+/g, '').replace(/[（()]/g, '');
}

function buildHeaderMap(headers: string[]): Map<keyof Omit<Product, 'id'>, number> {
  const map = new Map<keyof Omit<Product, 'id'>, number>();
  const normalized = headers.map(normHeader);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof Omit<Product, 'id'>, string[]][]) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(normHeader(alias));
      if (idx >= 0) {
        map.set(field, idx);
        break;
      }
    }
  }
  return map;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[$,\s元NT]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asImageUrls(v: unknown): string[] {
  if (!v) return [];
  const text = String(v);
  return text.split(/[\n,;|]+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s));
}

function asSpecs(v: unknown): { name: string; value: string }[] {
  if (!v) return [];
  const text = String(v);
  return text.split(/[|,\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const [name, ...rest] = part.split(':');
      return { name: name.trim(), value: rest.join(':').trim() };
    })
    .filter(s => s.name);
}

export interface ImportResult {
  rows: Product[];
  unmapped: string[];
  totalSourceRows: number;
  format?: 'easystore' | 'generic';
}

/**
 * Convert an array of raw spreadsheet rows (first row = headers) to Product
 * objects. Routes to the EasyStore adapter when its signature columns are
 * present, otherwise falls back to alias-based generic mapping.
 */
export function rowsToProducts(rawRows: unknown[][]): ImportResult {
  if (!rawRows.length) return { rows: [], unmapped: [], totalSourceRows: 0 };
  const headers = (rawRows[0] ?? []).map(h => String(h ?? '').trim());
  if (detectEasyStore(headers)) {
    return easyStoreToProducts(rawRows);
  }
  return genericRowsToProducts(rawRows);
}

function genericRowsToProducts(rawRows: unknown[][]): ImportResult {
  if (!rawRows.length) return { rows: [], unmapped: [], totalSourceRows: 0 };
  const [headerRow, ...dataRows] = rawRows;
  const headers = (headerRow ?? []).map(h => String(h ?? '').trim());
  const map = buildHeaderMap(headers);
  const mappedIndices = new Set(map.values());
  const unmapped = headers.filter((_, i) => !mappedIndices.has(i) && headers[i]);

  const rows: Product[] = dataRows
    .filter(r => r && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
    .map(r => {
      const get = (field: keyof Omit<Product, 'id'>): unknown => {
        const idx = map.get(field);
        return idx !== undefined ? r[idx] : undefined;
      };
      return {
        ...EMPTY_PRODUCT,
        id: makeId('imp'),
        name: String(get('name') ?? '').trim(),
        description: String(get('description') ?? '').trim(),
        price: asNumber(get('price')),
        originalPrice: get('originalPrice') !== undefined ? asNumber(get('originalPrice')) : undefined,
        cost: get('cost') !== undefined ? asNumber(get('cost')) : undefined,
        stock: asNumber(get('stock')),
        model: String(get('model') ?? '').trim(),
        brand: String(get('brand') ?? '').trim(),
        category: String(get('category') ?? '').trim(),
        momoCategoryCode: String(get('momoCategoryCode') ?? '').trim(),
        yahooCategoryCode: String(get('yahooCategoryCode') ?? '').trim(),
        pinkoiCategory: String(get('pinkoiCategory') ?? '').trim(),
        shopeeCategoryCode: String(get('shopeeCategoryCode') ?? '').trim(),
        rutenCategoryCode: String(get('rutenCategoryCode') ?? '').trim(),
        specs: asSpecs(get('specs')),
        imageUrls: asImageUrls(get('imageUrls')),
        videoUrl: String(get('videoUrl') ?? '').trim(),
        tags: String(get('tags') ?? '').trim(),
        weightG: asNumber(get('weightG')),
        condition: (String(get('condition') ?? '').includes('二手') ? '二手' : '新品') as '新品' | '二手',
        origin: String(get('origin') ?? '').trim() || '台灣',
        warranty: String(get('warranty') ?? '').trim(),
        shippingDays: asNumber(get('shippingDays'), 3),
      };
    });

  return { rows, unmapped, totalSourceRows: dataRows.length, format: 'generic' };
}

/** Loads SheetJS only when the user actually picks a file. */
export async function readExcelFile(file: File): Promise<unknown[][]> {
  const xlsx = await import('xlsx');
  const buf = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  // For text formats (.csv/.tsv), SheetJS's encoding heuristic mis-detects
  // UTF-8 as Latin-1 when the file lacks a BOM (EasyStore exports do not
  // include one, mangling Chinese characters). Decode as UTF-8 ourselves and
  // hand SheetJS a string instead.
  let wb: ReturnType<typeof xlsx.read>;
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    const text = new TextDecoder('utf-8').decode(buf);
    wb = xlsx.read(text, { type: 'string' });
  } else {
    wb = xlsx.read(buf, { type: 'array' });
  }
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = wb.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
}
