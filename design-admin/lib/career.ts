import { CareerStage } from '../types';

// 預設職涯階梯：資深專業設計師路線（可由自訂目標補充）
// milestone id 為穩定字串，作為進度勾選的 key。
export const CAREER_LADDER: CareerStage[] = [
  {
    id: 'stage-1',
    title: '初級設計師',
    subtitle: '打底：熟練工具與品牌規範',
    milestones: [
      { id: 's1-tools', label: '熟練 Photoshop / Illustrator 基本操作、去背與打光' },
      { id: 's1-template', label: '能依模板完成商品圖與上架圖' },
      { id: 's1-brand', label: '理解品牌風格（日系・廟宇民俗）與視覺規範' },
      { id: 's1-naming', label: '建立規範化檔名與資料夾結構' },
    ],
  },
  {
    id: 'stage-2',
    title: '中級設計師',
    subtitle: '獨立產出：一款設計從原創到上架',
    milestones: [
      { id: 's2-solo', label: '獨立完成一款手機殼：原創 → 白底圖 → 商品圖 → 上架' },
      { id: 's2-smart', label: '熟用智慧物件 / 批次動作加速輸出' },
      { id: 's2-detail', label: '建立並維護詳情頁模組化版型庫' },
      { id: 's2-ai', label: '導入 AI 生圖於情境圖工作流' },
      { id: 's2-kpi', label: '穩定達成每月 KPI（4 款獨家手機殼）' },
    ],
  },
  {
    id: 'stage-3',
    title: '資深設計師',
    subtitle: '風格與效率：建立辨識度與產能制度',
    milestones: [
      { id: 's3-style', label: '形成可辨識的個人設計風格' },
      { id: 's3-series', label: '主導系列 / 聯名款企劃（如刺青聯名）' },
      { id: 's3-flow', label: '優化整體出圖流程、建立產能緩衝制度' },
      { id: 's3-market', label: '作品獲市場驗證（熱銷款 / 回購）' },
      { id: 's3-custom', label: '能估算與管理接案 / 客製案' },
    ],
  },
  {
    id: 'stage-4',
    title: '首席 / 專家設計師',
    subtitle: '影響力：建立準則、對外拓展',
    milestones: [
      { id: 's4-guide', label: '建立設計準則與範本供他人沿用' },
      { id: 's4-mentor', label: '指導 / 帶領新進設計師' },
      { id: 's4-cross', label: '跨部門（行銷 / 電商）協作、主導視覺策略' },
      { id: 's4-brand', label: '對外經營：個人品牌、社群、聯名拓展' },
    ],
  },
];

export const ALL_MILESTONE_IDS = CAREER_LADDER.flatMap((s) => s.milestones.map((m) => m.id));
