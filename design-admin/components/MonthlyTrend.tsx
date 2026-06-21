import React from 'react';
import { useApp } from '../context/AppContext';
import { monthLabel, shiftMonth } from '../lib/period';

const MONTHS_BACK = 6;

export const MonthlyTrend: React.FC = () => {
  const { selectedMonth, statsForMonth } = useApp();

  // 取含當月在內、往前共 6 個月
  const months = Array.from({ length: MONTHS_BACK }, (_, i) =>
    shiftMonth(selectedMonth, -(MONTHS_BACK - 1 - i))
  );

  const rows = months.map((m) => {
    const s = statsForMonth(m);
    const pct = s.target.phoneCaseTarget
      ? Math.round((s.phoneCaseDone / s.target.phoneCaseTarget) * 100)
      : 0;
    return {
      month: m,
      pct,
      done: s.phoneCaseDone,
      target: s.target.phoneCaseTarget,
      shifts: s.shiftsAttended,
      commission: s.commissionTotal,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-sm font-semibold text-slate-500 mb-1">
        近 {MONTHS_BACK} 個月手機殼 KPI 達成率
      </div>
      <div className="text-xs text-slate-400 mb-4">
        柱高為達成率（達標 100% 以綠色標示）；底部標註夜市出勤次數，可對照「夜市多的月份是否拖累 KPI」
      </div>

      {/* 柱狀圖 */}
      <div className="flex items-end gap-3 h-44">
        {rows.map((r) => {
          const reached = r.target > 0 && r.done >= r.target;
          const barH = Math.min(100, r.pct); // 視覺上限 100%
          return (
            <div key={r.month} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-xs font-medium text-slate-600 mb-1">{r.pct}%</div>
              <div className="w-full bg-slate-100 rounded-t-md flex items-end" style={{ height: '100%' }}>
                <div
                  className={`w-full rounded-t-md ${reached ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                  style={{ height: `${barH}%` }}
                  title={`${r.done}/${r.target} 款`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X 軸標籤 */}
      <div className="flex gap-3 mt-2">
        {rows.map((r) => (
          <div key={r.month} className="flex-1 text-center">
            <div className="text-xs text-slate-500">{monthLabel(r.month).replace(/^\d+ 年 /, '')}</div>
            <div className="text-[11px] text-slate-400">
              {r.done}/{r.target} 款
            </div>
            <div className="text-[11px] text-amber-500">夜市 {r.shifts} 次</div>
            {r.commission > 0 && (
              <div className="text-[11px] text-yellow-600">抽 ${r.commission.toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
