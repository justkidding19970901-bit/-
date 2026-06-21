// 單一資料存取層：localStorage 讀寫 + 種子資料 + 固定設定
// 未來要換成雲端後端，只需替換此檔的讀寫實作。
import { ChecklistItem, KpiTarget, ListingSpec, Member, Session, Shift, WorkItem } from '../types';
import { currentMonth, shiftMonth, weekendsOfMonth } from './period';
import { uid } from './id';

const KEY = {
  members: 'design-admin:members',
  workItems: 'design-admin:workItems',
  shifts: 'design-admin:shifts',
  kpiTargets: 'design-admin:kpiTargets',
  session: 'design-admin:session',
};

// 主管通行碼（內部工具用，非真正資安；可自行修改）
export const MANAGER_PASSCODE = 'admin';

// KPI 預設目標
export const DEFAULT_TARGET: Omit<KpiTarget, 'month'> = {
  phoneCaseTarget: 4,
  commissionTarget: 1,
  productImageTarget: 8,
  ecommerceImageTarget: 8,
};

// 上架圖規格對照（報告對策 B）— 16 Pro / 17 Pro，數值為預設，可請設計師校正
export const LISTING_SPECS: ListingSpec[] = [
  { label: '電商主圖（方圖）', size: '1000 x 1000 px', format: 'JPG / sRGB', note: '去背白底，留邊約 10%' },
  { label: '商品情境圖', size: '1200 x 1200 px', format: 'JPG / sRGB', note: '套用情境風格庫背景' },
  { label: '詳情頁長圖', size: '寬 750 px（高不限）', format: 'JPG / sRGB', note: '用模組化版型，分段輸出' },
  { label: '機型對應圖（16 Pro）', size: '1000 x 1000 px', format: 'PNG / 透明', note: '智慧物件替換主圖' },
  { label: '機型對應圖（17 Pro）', size: '1000 x 1000 px', format: 'PNG / 透明', note: '智慧物件替換主圖' },
  { label: '社群／夜市宣傳圖', size: '1080 x 1350 px', format: 'JPG / sRGB', note: '可重用夜市素材範本' },
];

// 詳情頁上架前檢查清單（報告對策 C）
export const DETAIL_CHECKLIST: ChecklistItem[] = [
  { id: 'hero', label: '主視覺 Hero 主圖到位' },
  { id: 'story', label: '設計理念／故事文案填寫（日系・廟宇民俗賣點）' },
  { id: 'model', label: '機型對應圖齊全（16 Pro + 17 Pro）' },
  { id: 'sgs', label: 'SGS 軍規防摔認證圖卡' },
  { id: 'spec', label: '規格表正確（材質／防摔等級／孔位／重量）' },
  { id: 'scene', label: '情境圖／細節圖到位' },
  { id: 'cta', label: 'CTA 區（購物車／門市／夜市資訊）' },
  { id: 'naming', label: '檔名／資料夾符合命名規範' },
];

// ---- 泛用讀寫 ----
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- 各資料存取 ----
export const getMembers = () => read<Member[]>(KEY.members, []);
export const saveMembers = (v: Member[]) => write(KEY.members, v);

export const getWorkItems = () => read<WorkItem[]>(KEY.workItems, []);
export const saveWorkItems = (v: WorkItem[]) => write(KEY.workItems, v);

export const getShifts = () => read<Shift[]>(KEY.shifts, []);
export const saveShifts = (v: Shift[]) => write(KEY.shifts, v);

export const getKpiTargets = () => read<KpiTarget[]>(KEY.kpiTargets, []);
export const saveKpiTargets = (v: KpiTarget[]) => write(KEY.kpiTargets, v);

export const getSession = () => read<Session | null>(KEY.session, null);
export const saveSession = (v: Session | null) => {
  if (v) write(KEY.session, v);
  else localStorage.removeItem(KEY.session);
};

// 取某月目標，若無則回預設值
export function targetForMonth(targets: KpiTarget[], month: string): KpiTarget {
  const found = targets.find((t) => t.month === month);
  return found ?? { month, ...DEFAULT_TARGET };
}

// ---- 種子資料：首次使用時填入，讓畫面一開就有內容 ----
const SEED_FLAG = 'design-admin:seeded';

export function seedIfEmpty(): void {
  if (localStorage.getItem(SEED_FLAG)) return;

  const now = new Date().toISOString();
  const month = currentMonth();

  const manager: Member = { id: uid('m_'), name: '主管', role: 'manager', active: true };
  const designer: Member = { id: uid('m_'), name: '設計師', role: 'designer', active: true };
  saveMembers([manager, designer]);

  const items: WorkItem[] = [
    { id: uid('w_'), month, type: 'phone_case', title: '眾川赴海（日系浪潮）', status: 'done', createdAt: now, updatedAt: now, doneAt: now },
    { id: uid('w_'), month, type: 'phone_case', title: '廟宇民俗・神將', status: 'in_progress', createdAt: now, updatedAt: now },
    { id: uid('w_'), month, type: 'phone_case', title: '新傳統・千鳥', status: 'draft', note: '備稿庫', createdAt: now, updatedAt: now },
    { id: uid('w_'), month, type: 'product_image', title: '眾川赴海 商品情境圖', status: 'done', createdAt: now, updatedAt: now, doneAt: now },
    { id: uid('w_'), month, type: 'ecommerce_image', title: '眾川赴海 詳情頁', status: 'review', createdAt: now, updatedAt: now },
    { id: uid('w_'), month, type: 'commission', title: '聯名刺青款 抽成圖', status: 'in_progress', commissionAmount: 0, createdAt: now, updatedAt: now },
    { id: uid('w_'), month, type: 'custom_case', title: '客戶客製・寵物照手機殼', status: 'in_progress', commissionAmount: 1280, note: '客戶委託', createdAt: now, updatedAt: now },
  ];
  saveWorkItems(items);

  // 種子排班：當月前兩個週末標為已出勤
  const weekends = weekendsOfMonth(month);
  const shifts: Shift[] = weekends.slice(0, 4).map((date, i) => ({
    id: uid('s_'),
    date,
    attended: i < 2,
    hours: 8,
    note: i < 2 ? '夜市擺攤' : '',
  }));
  saveShifts(shifts);

  // 前幾個月的歷史資料（給跨月趨勢用），達成數刻意不同以呈現變化
  const history: WorkItem[] = [];
  const historyShifts: Shift[] = [];
  const pastDoneByOffset = [4, 3, 2, 4, 3]; // 1~5 個月前的手機殼完成數
  pastDoneByOffset.forEach((doneCount, idx) => {
    const pastMonth = shiftMonth(month, -(idx + 1));
    for (let i = 0; i < doneCount; i++) {
      history.push({
        id: uid('w_'),
        month: pastMonth,
        type: 'phone_case',
        title: `${pastMonth} 手機殼 #${i + 1}`,
        status: 'done',
        createdAt: now,
        updatedAt: now,
        doneAt: now,
      });
    }
    // 夜市出勤次數（與達成數呈反向，凸顯取捨）
    const attendCount = 6 - doneCount;
    weekendsOfMonth(pastMonth)
      .slice(0, attendCount)
      .forEach((date) =>
        historyShifts.push({ id: uid('s_'), date, attended: true, hours: 8, note: '夜市擺攤' })
      );
  });
  saveWorkItems([...items, ...history]);
  saveShifts([...shifts, ...historyShifts]);

  saveKpiTargets([{ month, ...DEFAULT_TARGET }]);

  localStorage.setItem(SEED_FLAG, '1');
}
