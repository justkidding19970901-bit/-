// 產生唯一 id 的小工具
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}
