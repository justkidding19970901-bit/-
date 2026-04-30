import { describe, it, expect } from 'vitest';
import { rowsToProducts } from './excelImport';

describe('rowsToProducts', () => {
  it('returns empty result for empty input', () => {
    const r = rowsToProducts([]);
    expect(r.rows).toEqual([]);
    expect(r.totalSourceRows).toBe(0);
  });

  it('maps Chinese headers to Product fields', () => {
    const r = rowsToProducts([
      ['商品名稱', '售價', '庫存', '商品圖片網址', '型號'],
      ['手機殼', '590', '10', 'https://example.com/a.jpg', 'MN-001'],
    ]);
    expect(r.rows.length).toBe(1);
    const p = r.rows[0];
    expect(p.name).toBe('手機殼');
    expect(p.price).toBe(590);
    expect(p.stock).toBe(10);
    expect(p.imageUrls).toEqual(['https://example.com/a.jpg']);
    expect(p.model).toBe('MN-001');
  });

  it('maps English headers to Product fields', () => {
    const r = rowsToProducts([
      ['name', 'price', 'sku', 'brand'],
      ['Test', '99', 'SKU1', 'Acme'],
    ]);
    expect(r.rows[0].name).toBe('Test');
    expect(r.rows[0].price).toBe(99);
    expect(r.rows[0].model).toBe('SKU1');
    expect(r.rows[0].brand).toBe('Acme');
  });

  it('strips currency symbols from price', () => {
    const r = rowsToProducts([
      ['商品名稱', '售價'],
      ['x', 'NT$ 1,200'],
    ]);
    expect(r.rows[0].price).toBe(1200);
  });

  it('parses multi-image cells separated by , ; | newline', () => {
    const r = rowsToProducts([
      ['商品名稱', '商品圖片'],
      ['x', 'https://a.com/1.jpg, https://a.com/2.jpg|https://a.com/3.jpg\nhttps://a.com/4.jpg'],
    ]);
    expect(r.rows[0].imageUrls.length).toBe(4);
  });

  it('filters out non-http strings from image cells', () => {
    const r = rowsToProducts([
      ['商品名稱', '商品圖片'],
      ['x', 'not-a-url, https://valid.com/x.jpg'],
    ]);
    expect(r.rows[0].imageUrls).toEqual(['https://valid.com/x.jpg']);
  });

  it('parses spec cells in name:value form', () => {
    const r = rowsToProducts([
      ['商品名稱', '規格'],
      ['x', '顏色:紅 | 尺寸:M'],
    ]);
    expect(r.rows[0].specs).toEqual([
      { name: '顏色', value: '紅' },
      { name: '尺寸', value: 'M' },
    ]);
  });

  it('reports headers we could not map', () => {
    const r = rowsToProducts([
      ['商品名稱', '我自己亂取的欄位'],
      ['x', 'whatever'],
    ]);
    expect(r.unmapped).toContain('我自己亂取的欄位');
  });

  it('drops empty rows', () => {
    const r = rowsToProducts([
      ['商品名稱', '售價'],
      ['x', '100'],
      ['', ''],
      ['y', '200'],
    ]);
    expect(r.rows.length).toBe(2);
  });

  it('defaults condition to 新品 unless 二手 is mentioned', () => {
    const r = rowsToProducts([
      ['商品名稱', '商品狀態'],
      ['a', '全新'],
      ['b', '二手'],
      ['c', ''],
    ]);
    expect(r.rows[0].condition).toBe('新品');
    expect(r.rows[1].condition).toBe('二手');
    expect(r.rows[2].condition).toBe('新品');
  });

  it('defaults shippingDays to 3 when missing', () => {
    const r = rowsToProducts([
      ['商品名稱'],
      ['a'],
    ]);
    expect(r.rows[0].shippingDays).toBe(3);
  });
});
