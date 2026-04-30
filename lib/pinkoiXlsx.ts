import type { Product } from '../types';
import { isPinkoiImageOk, type DimEntry } from './imageDims';

/**
 * Pinkoi 批次上傳 xlsx 匯出(墨盾品牌專用)。
 *
 * **完整規則文件**(欄位映射、預設值、清洗規則、批次規則、決策動機):
 * 參見 Claude 記憶檔 `project_pinkoi_export_rules.md`。新增商品或修改規則
 * 時都先看那份,再改本檔。
 *
 * 摘要:
 * - 用官方 v2.0 範本(`templates/pinkoi_v2_0.xlsx`)為骨架,A1:BA9 神聖區
 *   完整保留,商品資料從 row 10 起。
 * - 每個 Product 一列,規格用 spec[0]/spec[1] 填 L/M/N/O 欄。
 * - 一份檔案 500 件上限(用戶硬規則)。多份打包成單一 zip 下載。
 * - 預設值在 `PINKOI_PRESETS` 一覽,改全店預設改這個常數即可。
 * - 字串都過 `stripDecorativeChars` (剝 emoji,SheetJS XML bug),
 *   名稱/規格再過 `cleanPinkoiText` (換 ｜| 為空格),
 *   敘述/摘要再過 `htmlToPlain` (剝 HTML)。
 */

const SHEET_NAME = '2. 模板 - 商品資訊在這裡填寫';
const DATA_START_ROW = 10; // 1-indexed
const TOTAL_COLS = 53;     // A..BA

/**
 * 墨盾設計部專屬預設值。Pinkoi 範本裡標 "必填" 但對單一品牌而言屬固定值
 * 的欄位,在這裡寫死,使用者不必每筆商品重填。要修改全店預設改這裡即可。
 */
const PINKOI_PRESETS = {
  販售許可: '原創商品',
  // 商品分類改為按 base name 關鍵字動態判定,見 classifyCategory()。
  // 此預設值是 fallback,只在 classifyCategory 全部 miss 時用(理論上不會)。
  商品分類: '創意科技 > 其他 - 1199',
  製造方式: '機器製造',
  商品產地: 'CN 中國大陸',
  // 一般訂單備貨天數(I 欄)留空 - 墨盾走接單訂製,不維護實體庫存
  接單訂製等候天數: 8,        // J 欄(付款後製作天數)
  BSMI: 'X',                 // 範本要求填 X 表示無此檢驗
  NCC: 'X',
  商品材質: '塑膠',
  對象: '不分性別',
} as const;

/**
 * 商品分類關鍵字對照表(墨盾品牌主要販售類目)。
 * 順序鎖死「最具體 → 最廣泛」,classifyCategory 從上往下掃,第一個命中就用。
 * 代號從 Pinkoi 範本「4. 商品分類對照表」查得。
 */
const PINKOI_CATEGORY_RULES: { keywords: readonly string[]; label: string }[] = [
  { keywords: ['行動電源', '充電線', '充電器'],
    label: '創意科技 > 行動電源/充電線 - 1113' },
  { keywords: ['充電盤', '充電板', '無線充電'],
    label: '創意科技 > 無線充電盤/板/座 - 1122' },
  { keywords: ['鏡頭貼', '鏡頭膜'],
    label: '創意科技 > 手機配件 - 1120' },
  { keywords: ['鋼化膜', '保護貼', '玻璃貼', '保護膜', '濾藍光'],
    label: '創意科技 > 平板/電腦保護殼/保護貼 - 1108' },
  { keywords: ['AirPods', '耳機套', '耳機保護', '鎖扣開關', '支架開關', '毛呢耳機'],
    label: '創意科技 > AirPods/耳機保護套 - 1121' },
  { keywords: ['手機支架', '平板支架'],
    label: '創意科技 > 手機/平板支架 - 1115' },
  { keywords: ['掛繩', '吊飾', '背帶'],
    label: '創意科技 > 手機掛繩/背帶 - 1124' },
  { keywords: ['手機殼', '手機套', 'MagSafe', 'IC鏡面', 'TP冰川', 'MS防摔',
                '鋁合金防摔', '極簡防摔', '防摔殼', '防摔', 'Magsafe'],
    label: '創意科技 > 手機殼/手機套 - 1114' },
];

function classifyCategory(baseName: string, isIPhoneGroup: boolean): string {
  for (const rule of PINKOI_CATEGORY_RULES) {
    if (rule.keywords.some(k => baseName.includes(k))) return rule.label;
  }
  // iPhone 群但名稱沒明說「殼/套」也當手機殼(iPhone 型號後綴本身就是手機殼指標)
  if (isIPhoneGroup) return '創意科技 > 手機殼/手機套 - 1114';
  return PINKOI_PRESETS.商品分類; // 通用群 fallback: 創意科技 > 其他
}

/**
 * 商品標籤(Y 欄)自動填充策略 - Pinkoi 建議填(影響搜尋曝光)。
 * 用戶有自填就保留;沒填就從 baseName + 類目自動衍生。
 */
const PINKOI_TAG_RULES: { keywords: readonly string[]; tags: readonly string[] }[] = [
  { keywords: ['鋼化膜', '保護貼', '玻璃貼', '保護膜'],
    tags: ['鋼化膜', '保護貼', '螢幕保護貼', 'iPhone保護貼'] },
  { keywords: ['鏡頭貼', '鏡頭膜'],
    tags: ['鏡頭貼', '相機保護貼', 'iPhone鏡頭貼'] },
  { keywords: ['AirPods', '耳機套', '耳機保護', '鎖扣開關', '支架開關', '毛呢耳機'],
    tags: ['AirPods', 'AirPods Pro', '耳機保護套', 'AirPods 殼'] },
  { keywords: ['行動電源', '充電線', '充電器'],
    tags: ['行動電源', '充電寶', '手機充電'] },
  { keywords: ['掛繩', '吊飾', '背帶'],
    tags: ['手機掛繩', '吊飾', '手機背帶'] },
  // 預設(手機殼類)放最後
  { keywords: ['手機殼', '手機套', 'MagSafe', 'IC鏡面', 'TP冰川', 'MS防摔',
                '鋁合金防摔', '極簡防摔', '防摔殼', '防摔', 'Magsafe'],
    tags: ['手機殼', 'iPhone殼', 'MagSafe', '防摔殼', '手機保護殼'] },
];

const PINKOI_BRAND_TAGS = ['墨盾', 'Monna Case', '原創設計'];

function pinkoiTags(rep: Product, baseName: string, isIPhoneGroup: boolean): string {
  // 用戶有自填 tags 就保留(信任設計師判斷)
  const userTags = stripDecorativeChars((rep.tags || '').trim());
  if (userTags) return userTags;

  const tags: string[] = [];

  // 從 baseName 抽設計名稱(去掉開頭【...】系列前綴)
  const design = baseName.replace(/^【[^】]*】\s*/, '').trim();
  if (design && design !== baseName) tags.push(design);

  // 類目關鍵字(依名稱命中第一條 PINKOI_TAG_RULES)
  for (const rule of PINKOI_TAG_RULES) {
    if (rule.keywords.some(k => baseName.includes(k))) {
      tags.push(...rule.tags);
      break;
    }
  }
  // iPhone 群但名稱沒明說殼/套,補手機殼類 tag
  if (isIPhoneGroup && !tags.some(t => /殼|套|MagSafe/i.test(t))) {
    tags.push('手機殼', 'iPhone殼', 'MagSafe');
  }

  tags.push(...PINKOI_BRAND_TAGS);

  // 去重 + 半形逗號分隔(Pinkoi 標準格式)
  return Array.from(new Set(tags.filter(Boolean))).join(',');
}

/**
 * iPhone 手機殼設計商品的固定規格組合,對齊 Pinkoi 後台:
 *   自訂(1) Magsafe 磁吸底殼 × 自訂(2) 18 個 iPhone 型號。
 * 順序照後台截圖排,不要動。半形 | 是 Pinkoi 規格系統使用的字元
 * (如 "i12 | 12 Pro"),保留。
 */
const PINKOI_VARIANT_SPEC_1 = 'Magsafe 磁吸底殼';
const PINKOI_VARIANT_MODELS: readonly string[] = [
  'i12 | 12 Pro', 'i13 | 14',     'i13 Pro',
  'i13 Pro Max', 'i14 Pro',       'i14 Pro Max',  'i15',
  'i14 | 15 Plus', 'i15 Pro',     'i15 Pro Max',  'i16',
  'i16 Plus',     'i16 Pro',      'i16 Pro Max',  'i17',
  'i17 Pro',      'i17 Pro Max',  'i17 Air',
];

/**
 * 把名稱正規化以利分群:全形 ｜ 與半形 \| 都統一為 ` | `,多重空白合併。
 * 用戶資料裡同一個型號可能寫成 "i13｜14"(全形)或 "i13 | 14"(半形),
 * 不正規化會 group 不到一起。
 */
function normalizeNameForGrouping(name: string): string {
  return name.replace(/[｜|]/g, ' | ').replace(/\s+/g, ' ').trim();
}

interface NameClass {
  /** 用作 group key 的基底名稱(已 normalize) */
  base: string;
  /** 完全匹配 PINKOI_VARIANT_MODELS 之一時的規範值,否則 null */
  modelMatch: string | null;
  /** 最後一個 ' - ' 之後的內容(如 "紅-福"、"i13 Pro");沒有 ' - ' 則 null */
  suffix: string | null;
}

/**
 * 把商品名稱拆成 base + suffix,並判斷 suffix 是否為 18 個 iPhone 變體之一。
 * - 匹配 → iPhone 群,共用同一 base 的商品合併成 1 個 Pinkoi listing × 18 變體列
 * - 不匹配但有 suffix → 通用群,共用同一 base 的商品合併成 1 個 listing × N 變體列(N = 群成員數)
 * - 沒 suffix → 視為單獨一群,1 個 listing × 1 預設變體
 */
function classifyName(name: string): NameClass {
  const normalized = normalizeNameForGrouping(name);
  for (const model of PINKOI_VARIANT_MODELS) {
    const dashSuffix = ` - ${model}`;
    if (normalized.endsWith(dashSuffix)) {
      return { base: normalized.slice(0, -dashSuffix.length), modelMatch: model, suffix: model };
    }
  }
  const lastDash = normalized.lastIndexOf(' - ');
  if (lastDash > 0) {
    return {
      base: normalized.slice(0, lastDash),
      modelMatch: null,
      suffix: normalized.slice(lastDash + 3),
    };
  }
  return { base: normalized, modelMatch: null, suffix: null };
}

interface GroupMember {
  product: Product;
  variantLabel: string;
}

interface ProductGroup {
  baseName: string;
  isIPhone: boolean;
  rep: Product;
  members: GroupMember[];
}

export function groupProductsForPinkoi(products: Product[]): ProductGroup[] {
  const iPhoneByBase = new Map<string, { rep: Product; modelMap: Map<string, Product> }>();
  const genericByBase = new Map<string, { rep: Product; members: GroupMember[] }>();

  for (const p of products) {
    const c = classifyName(p.name || '');
    if (c.modelMatch) {
      const existing = iPhoneByBase.get(c.base);
      if (existing) {
        existing.modelMap.set(c.modelMatch, p);
      } else {
        const modelMap = new Map<string, Product>();
        modelMap.set(c.modelMatch, p);
        iPhoneByBase.set(c.base, { rep: p, modelMap });
      }
    } else {
      const variantLabel = c.suffix || '預設款';
      const existing = genericByBase.get(c.base);
      if (existing) {
        existing.members.push({ product: p, variantLabel });
      } else {
        genericByBase.set(c.base, { rep: p, members: [{ product: p, variantLabel }] });
      }
    }
  }

  const out: ProductGroup[] = [];
  for (const [base, { rep, modelMap }] of iPhoneByBase) {
    const members: GroupMember[] = PINKOI_VARIANT_MODELS.map(model => ({
      product: modelMap.get(model) ?? rep, // 沒有對應產品就用 rep 兜
      variantLabel: model,
    }));
    // iPhone 群固定 18 變體,不會超 50,直接塞
    out.push({ baseName: base, isIPhone: true, rep, members });
  }
  for (const [base, { rep, members }] of genericByBase) {
    // 通用群可能超過 Pinkoi「同商品最多 50 組規格」,超過要拆成多個 listing
    if (members.length <= PINKOI_MAX_VARIANTS_PER_LISTING) {
      out.push({ baseName: base, isIPhone: false, rep, members });
      continue;
    }
    const totalParts = Math.ceil(members.length / PINKOI_MAX_VARIANTS_PER_LISTING);
    for (let i = 0; i < totalParts; i++) {
      const slice = members.slice(
        i * PINKOI_MAX_VARIANTS_PER_LISTING,
        (i + 1) * PINKOI_MAX_VARIANTS_PER_LISTING,
      );
      out.push({
        baseName: `${base} (${i + 1}/${totalParts})`, // 名稱後綴避免 Pinkoi 視為同商品衝突
        isIPhone: false,
        rep: slice[0].product,
        members: slice,
      });
    }
  }
  return out;
}

// 剝除兩類字元:
// (1) 非 BMP 字元(emoji 如 🐼、🔑 等):SheetJS 序列化會吃掉前面的 `<`,
//     把 `</v>` 寫成 `/v>` 導致 XML 結構壞掉(Excel 跳警告、openpyxl
//     直接 ParseError)。
// (2) BMP 內常見裝飾/特殊符號(★ ♥ ⭐ ※ ° × ÷ 等):Pinkoi 規範
//     「避免使用特殊符號、表情符號、數學符號或是 emoji」。會被紅標。
//
// 度數符號 ° 換成「度」(Pinkoi 範例「寫『18度』而非『18°』」)。
function stripDecorativeChars(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')   // 非 BMP / emoji
    .replace(/°/g, '度')                              // 度數
    // BMP 內裝飾/符號區段(全剝):
    .replace(/[\u2300-\u23FF]/g, '')                  // Miscellaneous Technical (⌘ ⌚ etc)
    .replace(/[\u2500-\u257F]/g, '')                  // Box Drawing
    .replace(/[\u2580-\u259F]/g, '')                  // Block Elements
    .replace(/[\u25A0-\u25FF]/g, '')                  // Geometric Shapes (◆ ◇ ● ○ △ ▲ etc)
    .replace(/[\u2600-\u26FF]/g, '')                  // Miscellaneous Symbols (☀ ☁ ★ ☆ ♥ ♦ etc)
    .replace(/[\u2700-\u27BF]/g, '')                  // Dingbats (✓ ✗ ✦ ✧ ❤ etc)
    .replace(/[\u2B00-\u2BFF]/g, '')                  // Misc Symbols and Arrows (⭐ etc)
    .replace(/[\u203B\u00B0]/g, '')                   // ※ 與殘留度數
    .replace(/[×÷±≈≠≤≥∞∑∏∫√]/g, '')                   // 數學符號
    .replace(/[\uFE00-\uFE0F]/g, '');                  // Variation Selectors(剝完 emoji 後孤立的 ️)
}

// Pinkoi 商品敘述/摘要不吃 HTML(範本範例都是純文字),需轉成換行純文字
function htmlToPlain(html: string): string {
  return stripDecorativeChars(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 描述空白會被 Pinkoi 退件(限 15-10000 字),用名稱+規格+品牌敘述補
function pinkoiDescription(p: Product): string {
  const desc = htmlToPlain(p.description || '');
  if (desc.length >= 15) return desc.slice(0, 10000);
  const parts = [
    p.name && `商品名稱：${p.name}`,
    p.specs.length && p.specs.map(s => `${s.name}：${s.value}`).join('、'),
    '本商品為墨盾設計部原創手機殼/手機套，採接單訂製方式生產。如有任何疑問歡迎聯繫客服。',
  ].filter(Boolean) as string[];
  return parts.join('\n').slice(0, 10000);
}

// 摘要限 15-120 字,空白或太短時補品牌標語
function pinkoiSummary(p: Product): string {
  const desc = htmlToPlain(p.description || '');
  const base = (desc || p.name || '').replace(/\s+/g, ' ').trim();
  if (base.length >= 15) return base.slice(0, 120);
  const padded = `${base}｜墨盾原創設計手機殼，接單訂製`.replace(/^｜/, '').slice(0, 120);
  return padded.length >= 15 ? padded : '墨盾原創設計手機殼/手機套，接單訂製';
}

function pinkoiImageList(p: Product, dimCache?: Map<string, DimEntry>): string {
  return p.imageUrls
    .map(s => s.trim())
    .filter(s => /^https?:\/\//i.test(s) && /\.(jpe?g|png)(\?|$|#)/i.test(s))
    .filter(s => (dimCache ? isPinkoiImageOk(dimCache.get(s)) : true))
    .slice(0, 9)
    .join(', ');
}

// Pinkoi 商品名稱不接受全形 ｜(會被紅標),換空格。
// 半形 | 保留 — Pinkoi 規格系統用它分隔型號(如 "i12 | 12 Pro"、"i13 | 14")。
function cleanPinkoiText(text: string): string {
  return (text || '').replace(/｜/g, ' ').replace(/\s+/g, ' ').trim();
}

function pinkoiName(name: string): string {
  const cleaned = cleanPinkoiText(name);
  return cleaned.length > 30 ? cleaned.slice(0, 30) : cleaned;
}

// Pinkoi 規格項目「自訂選項以 36 個字元為限」
function pinkoiSpec(value: string): string {
  const cleaned = cleanPinkoiText(value);
  return cleaned.length > 36 ? cleaned.slice(0, 36) : cleaned;
}

// Pinkoi「同商品最多 50 組規格」(用戶部分通用群 63-72 變體會被退)
const PINKOI_MAX_VARIANTS_PER_LISTING = 50;

interface RowCell {
  col: number; // 0-indexed
  value: string | number;
}

/**
 * 把一個 ProductGroup 展開成 Pinkoi 結構:
 *   row 0:        主列(用 baseName 當商品名稱、rep 提供描述/摘要等共用資訊)
 *   row 1..N:     N 個變體列(同上傳編號、各自帶規格/SKU/數量/價格)
 *
 * iPhone 群: N=18 變體,規格雙維度(Magsafe × iPhone 型號)。對應到具體
 *   產品的變體用該產品的 stock/price,沒有對應產品的型號用 rep 兜。
 * 通用群: N=群成員數,規格單維度(suffix 直填到 規格項目1)。每變體用
 *   各自成員的 stock/price。
 */
function pinkoiRowsForGroup(group: ProductGroup, uploadNo: number, dimCache?: Map<string, DimEntry>): RowCell[][] {
  const rep = group.rep;
  const repForName: Product = { ...rep, name: group.baseName };

  // 主列 - 用 baseName + rep 的描述/摘要/tags;不含規格/SKU/數量/價格
  const main: RowCell[] = [];
  const pushMain = (col: number, value: string | number | undefined | null) => {
    if (value === undefined || value === null || value === '') return;
    main.push({ col, value });
  };
  pushMain(0, uploadNo);                                // A  商品上傳編號
  pushMain(1, PINKOI_PRESETS.販售許可);                  // B  販售許可
  // D 商品圖片 — Pinkoi 規範「同商品不同規格,圖片只填第一列」,所以只在主列填
  pushMain(3, pinkoiImageList(rep, dimCache));          // D  商品圖片
  pushMain(4, pinkoiName(group.baseName));              // E  商品名稱 (用 baseName)
  pushMain(5, classifyCategory(group.baseName, group.isIPhone)); // F  商品分類(依名稱關鍵字判定)
  pushMain(6, PINKOI_PRESETS.製造方式);                  // G  製造方式
  pushMain(7, PINKOI_PRESETS.商品產地);                  // H  商品產地
  pushMain(9, PINKOI_PRESETS.接單訂製等候天數);          // J  接單訂製天數
  pushMain(18, PINKOI_PRESETS.BSMI);                    // S  BSMI
  pushMain(19, PINKOI_PRESETS.NCC);                     // T  NCC
  pushMain(20, PINKOI_PRESETS.商品材質);                // U  商品材質
  pushMain(23, PINKOI_PRESETS.對象);                    // X  對象
  pushMain(24, pinkoiTags(rep, group.baseName, group.isIPhone)); // Y  商品標籤(自動填)
  pushMain(25, pinkoiSummary(repForName));              // Z  商品摘要
  pushMain(26, pinkoiDescription(repForName));          // AA 商品敘述

  // 變體列
  const baseSku = (rep.model || '').trim() || `p${uploadNo}`;
  const variantRows: RowCell[][] = group.members.map((m, idx) => {
    const cells: RowCell[] = [];
    cells.push({ col: 0, value: uploadNo });                                       // A
    if (group.isIPhone) {
      cells.push({ col: 11, value: '自訂' });                                       // L
      cells.push({ col: 12, value: pinkoiSpec(PINKOI_VARIANT_SPEC_1) });           // M  Magsafe 磁吸底殼
      cells.push({ col: 13, value: '自訂' });                                       // N
      cells.push({ col: 14, value: pinkoiSpec(m.variantLabel) });                  // O  iPhone 型號
    } else {
      cells.push({ col: 11, value: '自訂' });                                       // L
      cells.push({ col: 12, value: pinkoiSpec(m.variantLabel) });                  // M  通用 suffix
    }
    cells.push({ col: 15, value: `${baseSku}-v${String(idx + 1).padStart(2, '0')}` }); // P  SKU
    cells.push({ col: 16, value: m.product.stock });                               // Q  數量
    cells.push({ col: 17, value: m.product.price });                               // R  價格
    return cells;
  });

  return [main, ...variantRows];
}

async function buildPinkoiXlsxFromGroups(
  groups: ProductGroup[],
  dimCache?: Map<string, DimEntry>,
): Promise<Uint8Array> {
  const xlsx = await import('xlsx');
  const templateUrl = new URL('../templates/pinkoi_v2_0.xlsx', import.meta.url).href;
  const buf = await fetch(templateUrl).then(r => {
    if (!r.ok) throw new Error(`無法載入 Pinkoi 範本 (HTTP ${r.status})`);
    return r.arrayBuffer();
  });
  const wb = xlsx.read(buf, { type: 'array', cellStyles: true });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Pinkoi 範本缺少工作表「${SHEET_NAME}」`);

  let row = DATA_START_ROW;
  for (let i = 0; i < groups.length; i++) {
    // Pinkoi 範本指示「上傳編號從 1 開始依序填寫」,每個批次檔案都從 1 重新編
    const groupRows = pinkoiRowsForGroup(groups[i], i + 1, dimCache);
    for (const cells of groupRows) {
      for (const { col, value } of cells) {
        const ref = xlsx.utils.encode_cell({ r: row - 1, c: col });
        // 字串一律剝 emoji(SheetJS XML 序列化 bug),數字直接寫
        const safe = typeof value === 'string' ? stripDecorativeChars(value) : value;
        ws[ref] = { t: typeof safe === 'number' ? 'n' : 's', v: safe };
      }
      row++;
    }
  }

  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:BA9');
  range.e.r = Math.max(range.e.r, row - 2);
  range.e.c = Math.max(range.e.c, TOTAL_COLS - 1);
  ws['!ref'] = xlsx.utils.encode_range(range);

  const out = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

/** 對外 API:全店商品 → group → xlsx bytes(單一檔)。多檔走 buildPinkoiXlsxBatches。 */
export async function buildPinkoiXlsx(
  products: Product[],
  dimCache?: Map<string, DimEntry>,
): Promise<Uint8Array> {
  return buildPinkoiXlsxFromGroups(groupProductsForPinkoi(products), dimCache);
}

/**
 * Pinkoi 後台批次上傳一份檔案上限 500 件商品(用戶確認的硬規則)。
 * 注意:這裡 500 件指 group 數(= Pinkoi listing 數),不是底層 Product 數。
 * 大小上限 10 MB 也保留,通常 500 group 遠低於 10 MB,但保險起見仍檢查。
 */
const PINKOI_PRODUCTS_PER_FILE = 500;
const PINKOI_MAX_BYTES = 9 * 1024 * 1024;

export interface PinkoiBatch {
  filename: string;
  bytes: Uint8Array;
  count: number;
  partIndex: number;
  totalParts: number;
}

export async function buildPinkoiXlsxBatches(
  products: Product[],
  dimCache?: Map<string, DimEntry>,
): Promise<PinkoiBatch[]> {
  if (!products.length) return [];

  // 全部 group 完再切批,避免同一 group 被切散到不同檔案
  const allGroups = groupProductsForPinkoi(products);
  const slices: ProductGroup[][] = [];
  for (let i = 0; i < allGroups.length; i += PINKOI_PRODUCTS_PER_FILE) {
    slices.push(allGroups.slice(i, i + PINKOI_PRODUCTS_PER_FILE));
  }

  const out: PinkoiBatch[] = [];
  for (let i = 0; i < slices.length; i++) {
    let slice = slices[i];
    let bytes = await buildPinkoiXlsxFromGroups(slice, dimCache);
    // 雙保險:若 500 group 擠出來仍 > 10 MB,折半重試
    while (bytes.length > PINKOI_MAX_BYTES && slice.length > 1) {
      const half = Math.ceil(slice.length / 2);
      const remainder = slice.slice(half);
      slice = slice.slice(0, half);
      slices.splice(i + 1, 0, remainder);
      bytes = await buildPinkoiXlsxFromGroups(slice, dimCache);
    }
    out.push({
      filename: '',
      bytes,
      count: slice.length,
      partIndex: i + 1,
      totalParts: 0,
    });
  }
  // 等全部切完才知 totalParts,回填
  for (const b of out) {
    b.totalParts = out.length;
    b.filename = out.length === 1
      ? 'pinkoi_products.xlsx'
      : `pinkoi_products_part${b.partIndex}_of_${out.length}.xlsx`;
  }
  return out;
}

export function downloadXlsx(filename: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
