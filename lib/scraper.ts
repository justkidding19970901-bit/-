import type { Product, ProductSpec } from '../types';

/**
 * Tries multiple public CORS proxies in order. Each call returns the raw HTML
 * string of the target page or throws after all proxies fail.
 */
const PROXIES: ((url: string) => string)[] = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

export interface ScrapeResult {
  partial: Partial<Omit<Product, 'id'>>;
  source: 'shopify-json' | 'json-ld' | 'open-graph' | 'fallback';
  sourceUrl: string;
  warnings: string[];
}

interface ShopifyProductJson {
  product: {
    id: number;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    handle: string;
    tags: string[] | string;
    variants: Array<{
      id: number;
      title: string;
      price: string;
      compare_at_price: string | null;
      sku: string;
      inventory_quantity?: number;
      option1?: string | null;
      option2?: string | null;
      option3?: string | null;
      available?: boolean;
    }>;
    options: Array<{ name: string; values: string[] }>;
    images: Array<{ src: string }>;
  };
}

function detectShopifyJsonEndpoint(url: string): string | null {
  const m = url.match(/^(https?:\/\/[^/]+)(?:\/collections\/[^/]+)?\/products\/([^/?#]+)/i);
  if (!m) return null;
  return `${m[1]}/products/${m[2]}.json`;
}

async function fetchJSONViaProxies<T>(targetUrl: string): Promise<T | null> {
  for (const buildUrl of PROXIES) {
    try {
      const res = await fetch(buildUrl(targetUrl), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const text = await res.text();
      const parsed = JSON.parse(text) as T;
      if (parsed) return parsed;
    } catch {
      /* try next proxy */
    }
  }
  return null;
}

async function tryShopifyJson(url: string): Promise<ScrapeResult | null> {
  const endpoint = detectShopifyJsonEndpoint(url);
  if (!endpoint) return null;
  const data = await fetchJSONViaProxies<ShopifyProductJson>(endpoint);
  if (!data?.product?.title) return null;

  const p = data.product;
  const v0 = p.variants?.[0];
  const totalStock = (p.variants ?? []).reduce(
    (acc, v) => acc + (typeof v.inventory_quantity === 'number' ? v.inventory_quantity : 0),
    0,
  );

  const specs: ProductSpec[] = (p.options ?? [])
    .filter(o => o.name && o.name.toLowerCase() !== 'title')
    .map(o => ({ name: o.name, value: (o.values ?? []).join(' / ') }));

  const tags = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags ?? '');
  const images = (p.images ?? []).map(i => i.src).filter(Boolean).slice(0, 10);

  const warnings: string[] = [];
  const price = v0 ? Number(v0.price) || 0 : 0;
  if (!price) warnings.push('未抓到價格，請手動填寫');
  if (!images.length) warnings.push('未抓到圖片');
  if ((p.variants ?? []).length > 1) {
    warnings.push(
      `此商品有 ${p.variants.length} 個變體（不同款式 / 顏色），目前只取第一個變體的價格與 SKU；庫存為全部變體加總`,
    );
  }

  const partial: Partial<Omit<Product, 'id'>> = {
    name: p.title,
    description: stripHtml(p.body_html ?? ''),
    price,
    originalPrice: v0?.compare_at_price ? Number(v0.compare_at_price) || undefined : undefined,
    stock: totalStock,
    model: v0?.sku ?? '',
    brand: p.vendor ?? '',
    category: p.product_type ?? '',
    specs,
    imageUrls: images,
    videoUrl: '',
    tags,
  };

  return { partial, source: 'shopify-json', sourceUrl: url, warnings };
}

async function fetchHTML(targetUrl: string): Promise<string> {
  const errors: string[] = [];
  for (const buildUrl of PROXIES) {
    try {
      const res = await fetch(buildUrl(targetUrl), {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
      if (!res.ok) {
        errors.push(`${res.status} ${res.statusText}`);
        continue;
      }
      const html = await res.text();
      if (html && html.length > 200) return html;
      errors.push('empty response');
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  throw new Error(`所有代理都失敗：${errors.join(' | ')}`);
}

function absoluteUrl(maybe: string, base: string): string {
  try {
    return new URL(maybe, base).toString();
  } catch {
    return maybe;
  }
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface JsonLdProduct {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  sku?: string;
  mpn?: string;
  brand?: string | { name?: string };
  category?: string;
  image?: string | string[] | { url?: string }[];
  video?: string | { contentUrl?: string; embedUrl?: string };
  offers?: any;
  productID?: string;
}

function pickProductFromLd(node: any): JsonLdProduct | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const p = pickProductFromLd(n);
      if (p) return p;
    }
    return null;
  }
  if (node['@graph']) {
    return pickProductFromLd(node['@graph']);
  }
  const t = node['@type'];
  const types = Array.isArray(t) ? t : [t];
  if (types.some(x => typeof x === 'string' && x.toLowerCase().includes('product'))) {
    return node as JsonLdProduct;
  }
  return null;
}

function parseJsonLd(doc: Document): JsonLdProduct | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const s of Array.from(scripts)) {
    const text = s.textContent?.trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const p = pickProductFromLd(parsed);
      if (p) return p;
    } catch {
      /* ignore malformed json-ld */
    }
  }
  return null;
}

function ldImageList(img: JsonLdProduct['image']): string[] {
  if (!img) return [];
  if (typeof img === 'string') return [img];
  if (Array.isArray(img)) {
    return img.map(x => (typeof x === 'string' ? x : x?.url ?? '')).filter(Boolean);
  }
  return [];
}

function ldVideo(v: JsonLdProduct['video']): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.contentUrl ?? v.embedUrl ?? '';
}

function ldOfferPrice(offers: any): { price: number; original?: number; stock?: number } {
  const flat = Array.isArray(offers) ? offers[0] : offers;
  if (!flat) return { price: 0 };
  const price = Number(flat.price ?? flat.lowPrice ?? 0) || 0;
  const original = flat.priceSpecification?.price
    ? Number(flat.priceSpecification.price)
    : undefined;
  const availability = String(flat.availability ?? '').toLowerCase();
  const stock = availability.includes('outofstock')
    ? 0
    : flat.inventoryLevel?.value
      ? Number(flat.inventoryLevel.value)
      : undefined;
  return { price, original, stock };
}

function metaContent(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const v = el?.getAttribute('content')?.trim();
    if (v) return v;
  }
  return '';
}

function parseFromJsonLd(ld: JsonLdProduct, baseUrl: string): Partial<Omit<Product, 'id'>> {
  const brand = typeof ld.brand === 'string' ? ld.brand : ld.brand?.name ?? '';
  const offer = ldOfferPrice(ld.offers);
  const images = uniq(ldImageList(ld.image)).map(u => absoluteUrl(u, baseUrl));
  return {
    name: ld.name?.trim() ?? '',
    description: ld.description ? stripHtml(ld.description) : '',
    model: ld.sku ?? ld.mpn ?? ld.productID ?? '',
    brand,
    category: ld.category ?? '',
    price: offer.price,
    originalPrice: offer.original,
    stock: offer.stock ?? 0,
    imageUrls: images,
    videoUrl: ldVideo(ld.video),
    specs: [],
    tags: '',
  };
}

function parseFromOpenGraph(doc: Document, baseUrl: string): Partial<Omit<Product, 'id'>> {
  const title =
    metaContent(doc, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title?.trim() ||
    '';
  const description =
    metaContent(doc, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]) || '';
  const mainImage = metaContent(doc, [
    'meta[property="og:image:secure_url"]',
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ]);
  const priceStr = metaContent(doc, [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
  ]);
  const video = metaContent(doc, [
    'meta[property="og:video:secure_url"]',
    'meta[property="og:video"]',
  ]);
  const images: string[] = [];
  if (mainImage) images.push(absoluteUrl(mainImage, baseUrl));
  doc.querySelectorAll<HTMLImageElement>('img').forEach(img => {
    const src = img.getAttribute('src') ?? img.getAttribute('data-src') ?? '';
    if (!src) return;
    const w = Number(img.getAttribute('width') || 0);
    const h = Number(img.getAttribute('height') || 0);
    if ((w && w < 100) || (h && h < 100)) return;
    if (/icon|logo|sprite|placeholder|avatar/i.test(src)) return;
    images.push(absoluteUrl(src, baseUrl));
  });

  return {
    name: title,
    description,
    price: priceStr ? Number(priceStr) || 0 : 0,
    stock: 0,
    model: '',
    brand: '',
    category: '',
    specs: [],
    imageUrls: uniq(images).slice(0, 10),
    videoUrl: video,
    tags: '',
  };
}

export async function scrapeProduct(rawUrl: string): Promise<ScrapeResult> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('請輸入完整網址（包含 http:// 或 https://）');
  }

  // Fast path: Shopify exposes /products/<handle>.json publicly with the
  // full product record (variants, options, images). Way more reliable
  // than HTML parsing.
  const shopifyResult = await tryShopifyJson(url).catch(() => null);
  if (shopifyResult) return shopifyResult;

  const html = await fetchHTML(url);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const warnings: string[] = [];

  const ld = parseJsonLd(doc);
  if (ld) {
    const partial = parseFromJsonLd(ld, url);
    // Top up with OG fallbacks for empty fields
    const og = parseFromOpenGraph(doc, url);
    const merged: Partial<Omit<Product, 'id'>> = {
      ...og,
      ...partial,
      imageUrls: uniq([...(partial.imageUrls ?? []), ...(og.imageUrls ?? [])]).slice(0, 10),
      description: partial.description || og.description || '',
      videoUrl: partial.videoUrl || og.videoUrl || '',
    };
    if (!merged.name) warnings.push('找不到商品名稱');
    if (!merged.price) warnings.push('找不到價格，請手動填寫');
    return { partial: merged, source: 'json-ld', sourceUrl: url, warnings };
  }

  const og = parseFromOpenGraph(doc, url);
  const hasOg = !!(og.name && (og.imageUrls?.length || og.description));
  if (!og.name) warnings.push('找不到商品名稱');
  if (!og.price) warnings.push('找不到價格，請手動填寫');
  if (!og.imageUrls?.length) warnings.push('找不到商品圖片');

  return {
    partial: og,
    source: hasOg ? 'open-graph' : 'fallback',
    sourceUrl: url,
    warnings,
  };
}
