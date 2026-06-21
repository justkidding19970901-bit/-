import { WorkStatus, WorkType } from '../types';

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  phone_case: '獨家手機殼',
  custom_case: '客製化手機殼',
  product_image: '商品圖合成',
  ecommerce_image: '電商上架圖/詳情頁',
  commission: '抽成圖像',
};

export const WORK_TYPE_ORDER: WorkType[] = [
  'phone_case',
  'custom_case',
  'product_image',
  'ecommerce_image',
  'commission',
];

// 有金額欄位的類型（抽成 / 客製訂單）
export const AMOUNT_TYPES: WorkType[] = ['commission', 'custom_case'];

export const AMOUNT_LABEL: Partial<Record<WorkType, string>> = {
  commission: '抽成金額（NT$）',
  custom_case: '客製訂單金額（NT$）',
};

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  draft: '備稿中',
  in_progress: '進行中',
  review: '待確認',
  done: '已完成',
};

export const WORK_STATUS_ORDER: WorkStatus[] = ['draft', 'in_progress', 'review', 'done'];

// Tailwind 色票（badge 用）
export const WORK_STATUS_STYLE: Record<WorkStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  review: 'bg-sky-100 text-sky-700',
  done: 'bg-emerald-100 text-emerald-700',
};

export const WORK_TYPE_STYLE: Record<WorkType, string> = {
  phone_case: 'bg-indigo-100 text-indigo-700',
  custom_case: 'bg-teal-100 text-teal-700',
  product_image: 'bg-purple-100 text-purple-700',
  ecommerce_image: 'bg-rose-100 text-rose-700',
  commission: 'bg-yellow-100 text-yellow-800',
};
