import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { monthLabel } from '../lib/period';

export const KpiSettings: React.FC = () => {
  const { selectedMonth, stats, setKpiTarget } = useApp();
  const { success } = useToast();
  const t = stats.target;

  const [phoneCaseTarget, setPhone] = useState(t.phoneCaseTarget);
  const [commissionTarget, setCommission] = useState(t.commissionTarget);
  const [productImageTarget, setProduct] = useState(t.productImageTarget);
  const [ecommerceImageTarget, setEcom] = useState(t.ecommerceImageTarget);
  const [saved, setSaved] = useState(false);

  // 月份切換時，t 會變 — 用 key 讓元件重置（在 App 端以 selectedMonth 當 key）
  const save = () => {
    setKpiTarget({
      month: selectedMonth,
      phoneCaseTarget: Number(phoneCaseTarget),
      commissionTarget: Number(commissionTarget),
      productImageTarget: Number(productImageTarget),
      ecommerceImageTarget: Number(ecommerceImageTarget),
    });
    setSaved(true);
    success(`${monthLabel(selectedMonth)} KPI 目標已更新`);
    setTimeout(() => setSaved(false), 2000);
  };

  const Field: React.FC<{ label: string; value: number; onChange: (n: number) => void; hint?: string }> = ({
    label,
    value,
    onChange,
    hint,
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
      />
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );

  return (
    <div className="max-w-md">
      <p className="text-sm text-slate-500 mb-4">
        設定 {monthLabel(selectedMonth)} 的 KPI 目標。夜市旺季可調降手機殼目標，讓 KPI 與工時對齊。
      </p>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <Field label="獨家手機殼（款/月）" value={phoneCaseTarget} onChange={setPhone} hint="基準值 4" />
        <Field label="抽成圖像（款/月）" value={commissionTarget} onChange={setCommission} hint="獎勵目標，預設 1" />
        <Field label="商品圖合成（張/月）" value={productImageTarget} onChange={setProduct} />
        <Field label="電商上架圖/詳情頁（張/月）" value={ecommerceImageTarget} onChange={setEcom} />

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            儲存目標
          </button>
          {saved && <span className="text-sm text-emerald-600">已儲存 ✓</span>}
        </div>
      </div>
    </div>
  );
};
