// 月份 / 日期相關小工具

// 取當月 'YYYY-MM'
export function currentMonth(): string {
  return toMonth(new Date());
}

export function toMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// 由 'YYYY-MM' 位移月份
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonth(d);
}

// 顯示用：'2026-06' -> '2026 年 6 月'
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y} 年 ${m} 月`;
}

// 'YYYY-MM-DD' 屬於哪個月
export function dateMonth(date: string): string {
  return date.slice(0, 7);
}

// 取某月所有週末（六、日）的日期字串
export function weekendsOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const result: string[] = [];
  const date = new Date(y, m - 1, 1);
  while (date.getMonth() === m - 1) {
    const day = date.getDay(); // 0=日, 6=六
    if (day === 0 || day === 6) {
      const dd = String(date.getDate()).padStart(2, '0');
      result.push(`${month}-${dd}`);
    }
    date.setDate(date.getDate() + 1);
  }
  return result;
}

// 顯示用：'2026-06-21' -> '6/21 (日)'
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
  return `${m}/${d} (${wd})`;
}
