// 設計部庶務控管系統 — 型別定義

export type Role = 'manager' | 'designer';

export type WorkType =
  | 'phone_case'      // 獨家手機殼
  | 'custom_case'     // 客製化手機殼（偶爾接案）
  | 'product_image'   // 商品圖合成
  | 'ecommerce_image' // 電商上架圖/詳情頁
  | 'commission';     // 抽成圖像（獎勵）

export type WorkStatus =
  | 'draft'        // 備稿中（產能緩衝庫）
  | 'in_progress'  // 進行中
  | 'review'       // 待確認
  | 'done';        // 已完成

export interface Member {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}

export interface WorkItem {
  id: string;
  month: string;            // 歸屬月份 'YYYY-MM'
  type: WorkType;
  title: string;
  status: WorkStatus;
  commissionAmount?: number; // 金額：commission 類型為抽成金額、custom_case 為客製訂單金額
  note?: string;
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
}

export interface Shift {
  id: string;
  date: string;     // 'YYYY-MM-DD'（通常為週六/週日夜市）
  attended: boolean; // 已出勤
  hours: number;     // 出勤時數（用於估算損失工時）
  note?: string;
}

export interface KpiTarget {
  month: string;             // 'YYYY-MM'
  phoneCaseTarget: number;   // 手機殼目標，預設 4
  commissionTarget: number;  // 抽成圖目標，預設 1
  productImageTarget: number;   // 商品圖目標
  ecommerceImageTarget: number; // 電商圖目標
}

export interface Session {
  memberId: string;
}

// 上架圖規格（對應報告對策 B）
export interface ListingSpec {
  label: string;     // 用途，如「主圖」「詳情頁長圖」
  size: string;      // 尺寸，如「1000 x 1000 px」
  format: string;    // 格式，如「JPG / 72dpi」
  note?: string;
}

// 詳情頁上架前檢查項（對應報告對策 C）
export interface ChecklistItem {
  id: string;
  label: string;
}
