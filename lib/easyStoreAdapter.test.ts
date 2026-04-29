import { describe, it, expect } from 'vitest';
import { detectEasyStore, easyStoreToProducts } from './easyStoreAdapter';

describe('detectEasyStore', () => {
  it('returns true when all signature columns are present', () => {
    expect(
      detectEasyStore(['Handle', 'Title', 'Body (HTML)', 'Image1', 'Option1 Name', 'SKU']),
    ).toBe(true);
  });

  it('returns false for generic Chinese-header CSV', () => {
    expect(detectEasyStore(['商品名稱', '售價', '庫存'])).toBe(false);
  });

  it('returns false when only some signature columns are present', () => {
    expect(detectEasyStore(['Handle', 'Title', 'Image1'])).toBe(false);
  });
});

describe('easyStoreToProducts', () => {
  const HEADERS = [
    'Handle', 'Title', 'Body (HTML)',
    'Image1', 'Image2',
    'Tags', 'Vendor', 'Brands',
    'Collection1', 'Collection2',
    'Option1 Name', 'Option1 Value',
    'Option2 Name', 'Option2 Value',
    'SKU', 'Price', 'Compare At Price', 'Cost Price',
    'Weight', 'Weight Unit',
    '1 Inventory', '002 Inventory', '003 Inventory',
  ];

  it('produces one product per variant row, forward-filling product-level fields', () => {
    const rows = [
      HEADERS,
      ['handle-1', '達摩鈴鐺', '<p>描述</p>',
        'https://a.jpg', 'https://b.jpg',
        'tag1, tag2', '墨盾', 'Brand1',
        '首頁推薦', '日式祈福',
        '顏色', '紅', '', '',
        'SKU-A1', '99', '0', '0',
        '0.5', 'kg',
        '10', '5', '3'],
      ['handle-1', '', '', '', '', '', '', '', '', '',
        '', '黑', '', '',
        'SKU-A2', '99', '0', '0',
        '', '',
        '8', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);

    expect(r.format).toBe('easystore');
    expect(r.rows.length).toBe(2);
    expect(r.totalSourceRows).toBe(2);

    const v1 = r.rows[0];
    expect(v1.name).toBe('達摩鈴鐺 - 紅');
    expect(v1.model).toBe('SKU-A1');
    expect(v1.price).toBe(99);
    expect(v1.stock).toBe(18); // 10 + 5 + 3
    expect(v1.imageUrls).toEqual(['https://a.jpg', 'https://b.jpg']);
    expect(v1.specs).toEqual([{ name: '顏色', value: '紅' }]);
    expect(v1.brand).toBe('墨盾'); // Vendor preferred over Brands
    expect(v1.tags).toBe('tag1, tag2');
    expect(v1.category).toBe('首頁推薦 / 日式祈福');
    expect(v1.weightG).toBe(500); // 0.5kg → 500g

    const v2 = r.rows[1];
    expect(v2.name).toBe('達摩鈴鐺 - 黑');
    expect(v2.model).toBe('SKU-A2');
    expect(v2.imageUrls).toEqual(['https://a.jpg', 'https://b.jpg']); // inherited
    expect(v2.brand).toBe('墨盾'); // inherited
    expect(v2.weightG).toBe(500); // inherited
    expect(v2.stock).toBe(8);
    expect(v2.specs).toEqual([{ name: '顏色', value: '黑' }]);
  });

  it('uses Title without suffix for single-variant products', () => {
    const rows = [
      HEADERS,
      ['handle-x', '單品', '', '', '', '', '', '', '', '',
        '', '', '', '',
        'SKU-X', '199', '0', '0',
        '0', 'g',
        '1', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].name).toBe('單品');
    expect(r.rows[0].specs).toEqual([]);
  });

  it('skips rows with empty Handle', () => {
    const rows = [
      HEADERS,
      ['handle-1', 'A', '', '', '', '', '', '', '', '',
        '', '', '', '',
        'SKU-1', '100', '0', '0', '0', 'g', '0', '0', '0'],
      ['', '', '', '', '', '', '', '', '', '',
        '', '', '', '',
        '', '', '', '', '', '', '', '', ''], // empty handle
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].name).toBe('A');
  });

  it('combines two option pairs into multi-spec', () => {
    const rows = [
      HEADERS,
      ['h-1', 'T-Shirt', '', '', '', '', '', '', '', '',
        '顏色', '紅', '尺寸', 'M',
        'SKU-RM', '300', '0', '0', '0', 'g', '5', '0', '0'],
      ['h-1', '', '', '', '', '', '', '', '', '',
        '', '黑', '', 'L',
        'SKU-BL', '300', '0', '0', '', '', '3', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].specs).toEqual([
      { name: '顏色', value: '紅' },
      { name: '尺寸', value: 'M' },
    ]);
    expect(r.rows[0].name).toBe('T-Shirt - 紅 / M');
    expect(r.rows[1].specs).toEqual([
      { name: '顏色', value: '黑' },
      { name: '尺寸', value: 'L' },
    ]);
    expect(r.rows[1].name).toBe('T-Shirt - 黑 / L');
  });

  it('treats Compare At Price = 0 as no original price', () => {
    const rows = [
      HEADERS,
      ['h-1', 'X', '', '', '', '', '', '', '', '',
        '', '', '', '',
        'SKU-X', '100', '0', '0', '0', 'g', '5', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].originalPrice).toBeUndefined();
  });

  it('reports compareAt as originalPrice only when greater than price', () => {
    const rows = [
      HEADERS,
      ['h-1', 'X', '', '', '', '', '', '', '', '',
        '', '', '', '',
        'SKU-X', '100', '199', '50', '0', 'g', '5', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].originalPrice).toBe(199);
    expect(r.rows[0].cost).toBe(50);
  });

  it('falls back to Barcode column when SKU column is empty (EasyStore quirk)', () => {
    const rows = [
      ['Handle', 'Title', 'Body (HTML)', 'Option1 Name', 'Option1 Value', 'SKU', 'Barcode', 'Price', '1 Inventory'],
      ['h-1', 'X', '', 'C', 'red', '', '36515958', '99', '5'],
      ['h-2', 'Y', '', 'C', 'blue', 'EXPLICIT-SKU', '99999999', '199', '3'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].model).toBe('36515958'); // SKU empty → fallback to Barcode
    expect(r.rows[1].model).toBe('EXPLICIT-SKU'); // SKU has value → wins over Barcode
  });

  it('falls back to Brands when Vendor is empty', () => {
    const rows = [
      HEADERS,
      ['h-1', 'X', '', '', '', '', '', 'BackupBrand', '', '',
        '', '', '', '',
        'SKU-X', '100', '0', '0', '0', 'g', '5', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].brand).toBe('BackupBrand');
  });

  it('filters non-http image URLs', () => {
    const rows = [
      HEADERS,
      ['h-1', 'X', '', 'https://a.jpg', 'not-a-url', '', '', '', '', '',
        '', '', '', '',
        'SKU-X', '100', '0', '0', '0', 'g', '5', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].imageUrls).toEqual(['https://a.jpg']);
  });

  it('sanitizes HTML in description', () => {
    const rows = [
      HEADERS,
      ['h-1', 'X',
        '<script>alert(1)</script><p style="font-family: arial">內文</p>',
        '', '', '', '', '', '', '',
        '', '', '', '',
        'SKU-X', '100', '0', '0', '0', 'g', '5', '0', '0'],
    ];
    const r = easyStoreToProducts(rows);
    expect(r.rows[0].description).not.toContain('<script>');
    expect(r.rows[0].description).toContain('內文');
  });

  it('returns empty result for empty input', () => {
    expect(easyStoreToProducts([])).toEqual({
      rows: [], unmapped: [], totalSourceRows: 0, format: 'easystore',
    });
  });
});
