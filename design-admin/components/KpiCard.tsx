import React from 'react';

interface Props {
  label: string;
  done: number;
  target?: number;     // 有目標 → 顯示進度條
  unit?: string;
  accent?: string;     // tailwind 進度條顏色
  subtitle?: string;
}

export const KpiCard: React.FC<Props> = ({
  label,
  done,
  target,
  unit = '',
  accent = 'bg-indigo-500',
  subtitle,
}) => {
  const hasTarget = typeof target === 'number' && target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((done / target!) * 100)) : 0;
  const reached = hasTarget && done >= target!;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-soft">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        {hasTarget && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              reached ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {reached ? '達標' : '未達標'}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-800">{done}</span>
        {hasTarget && <span className="text-lg text-slate-400">/ {target}</span>}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>

      {hasTarget && (
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${reached ? 'bg-emerald-500' : accent}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {subtitle && <div className="mt-2 text-xs text-slate-400">{subtitle}</div>}
    </div>
  );
};
