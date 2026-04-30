import type { Product } from '../types';
import { EMPTY_PRODUCT } from '../types';
import { sanitizeHtml } from './htmlSanitize';
import type { ImportResult } from './excelImport';
import { makeId } from './id';

/**
 * Adapter for EasyStore's "下載所有商品" CSV (Shopify-compatible layout).
 *
 * Differences from a generic spreadsheet:
 *  - Multi-row variants: the 1st row holds product-level fields (Title, Body,
 *    Images, Tags, Vendor, Collections, Weight). Rows 2..N share the same
 *    Handle but only fill variant fields (Option values, SKU, Price, Inventory).
 *    We forward-fill the product-level fields onto every variant.
 *  - 12 image columns Image1..Image12 collapse into one imageUrls list.
 *  - Up to 3 Option Name/Value pairs collapse into specs[].
 *  - Weight needs Weight Unit conversion (kg/lb/oz → g).
 *  - Inventory split across multiple warehouse columns ("1 Inventory",
 *    "002 Inventory", ...) — sum into a single stock count.
 *  - Body (HTML) often carries inline-style cruft → sanitizeHtml.
 *
 * Each variant becomes its own Product row (matching the system's "1 SKU
 * per product" model used by the platform CSV exporters).
 */

const EASYSTORE_REQUIRED_HEADERS = ['Handle', 'Body (HTML)', 'Option1 Name'];

export function detectEasyStore(headers: string[]): boolean {
  const set = new Set(headers.map(h => h.trim()));
  return EASYSTORE_REQUIRED_HEADERS.every(s => set.has(s));
}

function findIdx(headers: string[], name: string): number {
  return headers.findIndex(h => h.trim() === name);
}

function findIdxRegex(headers: string[], pattern: RegExp): number[] {
  const out: number[] = [];
  headers.forEach((h, i) => {
    if (pattern.test(h.trim())) out.push(i);
  });
  return out;
}

function asNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function weightToGrams(value: number, unit: string): number {
  const u = unit.trim().toLowerCase();
  if (u === 'kg') return Math.round(value * 1000);
  if (u === 'lb') return Math.round(value * 453.592);
  if (u === 'oz') return Math.round(value * 28.3495);
  // 'g' or unspecified → assume grams
  return Math.round(value);
}

interface ColumnIndex {
  HANDLE: number;
  TITLE: number;
  BODY: number;
  PRICE: number;
  COMPARE: number;
  COST: number;
  SKU: number;
  BARCODE: number;
  VENDOR: number;
  BRANDS: number;
  TAGS: number;
  WEIGHT: number;
  WEIGHT_UNIT: number;
  IMAGES: number[];
  OPTIONS: { nameIdx: number; valueIdx: number }[];
  COLLECTIONS: number[];
  INVENTORIES: number[];
}

function buildIndex(headers: string[]): ColumnIndex {
  return {
    HANDLE: findIdx(headers, 'Handle'),
    TITLE: findIdx(headers, 'Title'),
    BODY: findIdx(headers, 'Body (HTML)'),
    PRICE: findIdx(headers, 'Price'),
    COMPARE: findIdx(headers, 'Compare At Price'),
    COST: findIdx(headers, 'Cost Price'),
    SKU: findIdx(headers, 'SKU'),
    BARCODE: findIdx(headers, 'Barcode'),
    VENDOR: findIdx(headers, 'Vendor'),
    BRANDS: findIdx(headers, 'Brands'),
    TAGS: findIdx(headers, 'Tags'),
    WEIGHT: findIdx(headers, 'Weight'),
    WEIGHT_UNIT: findIdx(headers, 'Weight Unit'),
    IMAGES: findIdxRegex(headers, /^Image\d+$/),
    OPTIONS: ([1, 2, 3] as const)
      .map(i => ({
        nameIdx: findIdx(headers, `Option${i} Name`),
        valueIdx: findIdx(headers, `Option${i} Value`),
      }))
      .filter(o => o.nameIdx >= 0 && o.valueIdx >= 0),
    COLLECTIONS: findIdxRegex(headers, /^Collection\d+$/),
    // Matches "1 Inventory", "002 Inventory", etc.
    INVENTORIES: findIdxRegex(headers, /^[\d]+\s*Inventory$/),
  };
}

export function easyStoreToProducts(rawRows: unknown[][]): ImportResult {
  if (!rawRows.length) return { rows: [], unmapped: [], totalSourceRows: 0, format: 'easystore' };
  const [headerRow, ...dataRows] = rawRows;
  const headers = (headerRow ?? []).map(h => String(h ?? '').trim());
  const idx = buildIndex(headers);

  // Group rows by Handle, preserving first-occurrence order
  const groupOrder: string[] = [];
  const groups = new Map<string, unknown[][]>();
  for (const row of dataRows) {
    if (!row) continue;
    const handle = idx.HANDLE >= 0 ? String(row[idx.HANDLE] ?? '').trim() : '';
    if (!handle) continue;
    if (!groups.has(handle)) {
      groups.set(handle, []);
      groupOrder.push(handle);
    }
    groups.get(handle)!.push(row);
  }

  const products: Product[] = [];

  for (const handle of groupOrder) {
    const variantRows = groups.get(handle)!;
    const anchor = variantRows[0];

    const baseTitle = idx.TITLE >= 0 ? String(anchor[idx.TITLE] ?? '').trim() : '';
    const description = idx.BODY >= 0 ? sanitizeHtml(String(anchor[idx.BODY] ?? '').trim()) : '';
    const tags = idx.TAGS >= 0 ? String(anchor[idx.TAGS] ?? '').trim() : '';
    const vendor = idx.VENDOR >= 0 ? String(anchor[idx.VENDOR] ?? '').trim() : '';
    const brands = idx.BRANDS >= 0 ? String(anchor[idx.BRANDS] ?? '').trim() : '';
    const brand = vendor || brands;
    const category = idx.COLLECTIONS
      .map(j => String(anchor[j] ?? '').trim())
      .filter(Boolean)
      .join(' / ');
    const imageUrls = idx.IMAGES
      .map(j => String(anchor[j] ?? '').trim())
      .filter(u => /^https?:\/\//i.test(u));

    const weightVal = idx.WEIGHT >= 0 ? asNumber(anchor[idx.WEIGHT]) : 0;
    const weightUnit = idx.WEIGHT_UNIT >= 0 ? String(anchor[idx.WEIGHT_UNIT] ?? '') : '';
    const weightG = weightToGrams(weightVal, weightUnit);

    // Option *names* come from the anchor row (variant rows leave them blank).
    // Option *values* differ per variant.
    const optionNames = idx.OPTIONS.map(o => String(anchor[o.nameIdx] ?? '').trim());

    const isMulti = variantRows.length > 1;

    for (const row of variantRows) {
      // EasyStore quirk: the column literally labeled "SKU" is usually empty;
      // merchants put the real product code in "Barcode". Prefer SKU if non-empty,
      // otherwise fall back to Barcode.
      const skuCol = idx.SKU >= 0 ? String(row[idx.SKU] ?? '').trim() : '';
      const barcodeCol = idx.BARCODE >= 0 ? String(row[idx.BARCODE] ?? '').trim() : '';
      const sku = skuCol || barcodeCol;
      const price = idx.PRICE >= 0 ? asNumber(row[idx.PRICE]) : 0;
      const compareAt = idx.COMPARE >= 0 ? asNumber(row[idx.COMPARE]) : 0;
      const cost = idx.COST >= 0 ? asNumber(row[idx.COST]) : 0;
      const stock = idx.INVENTORIES.reduce((s, j) => s + asNumber(row[j]), 0);

      const specs = idx.OPTIONS
        .map((o, i) => ({
          name: optionNames[i] || String(row[o.nameIdx] ?? '').trim(),
          value: String(row[o.valueIdx] ?? '').trim(),
        }))
        .filter(s => s.name && s.value);

      const variantSuffix = specs.map(s => s.value).join(' / ');
      const name = isMulti && variantSuffix ? `${baseTitle} - ${variantSuffix}` : baseTitle;

      products.push({
        ...EMPTY_PRODUCT,
        id: makeId('es'),
        name,
        description,
        price: Math.round(price),
        originalPrice: compareAt > 0 && compareAt > price ? Math.round(compareAt) : undefined,
        cost: cost > 0 ? Math.round(cost) : undefined,
        stock: Math.round(stock),
        model: sku,
        brand,
        category,
        specs,
        imageUrls,
        videoUrl: '',
        tags,
        weightG,
        condition: '新品',
        origin: '台灣',
        warranty: '',
        shippingDays: 3,
      });
    }
  }

  return {
    rows: products,
    // Empty: EasyStore columns we ignore (Handle/Meta Description/Barcode/etc.)
    // are intentional, not "unmapped" mistakes — no need to nag the user.
    unmapped: [],
    totalSourceRows: dataRows.length,
    format: 'easystore',
  };
}
