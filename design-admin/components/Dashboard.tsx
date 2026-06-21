import React from 'react';
import { useApp } from '../context/AppContext';
import { KpiCard } from './KpiCard';
import { MonthlyTrend } from './MonthlyTrend';
import { monthLabel } from '../lib/period';

export const Dashboard: React.FC = () => {
  const { stats, selectedMonth } = useApp();
  const t = stats.target;

  // 夜市工時 vs KPI：估算被夜市吃掉的工作天（8 小時/天）與當月手機殼達成率
  const lostDays = Math.round((stats.marketHours / 8) * 10) / 10;
  const phaseReached = stats.phoneCaseDone >= t.phoneCaseTarget;

  return (
    <div className="space-y-6">
      {/* KPI 儀表 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-3">
          {monthLabel(selectedMonth)}　KPI 達成
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="獨家手機殼"
            done={stats.phoneCaseDone}
            target={t.phoneCaseTarget}
            unit="款"
            accent="bg-indigo-500"
          />
          <KpiCard
            label="商品圖合成"
            done={stats.productImageDone}
            target={t.productImageTarget}
            unit="張"
            accent="bg-purple-500"
          />
          <KpiCard
            label="電商上架圖/詳情頁"
            done={stats.ecommerceImageDone}
            target={t.ecommerceImageTarget}
            unit="張"
            accent="bg-rose-500"
          />
          <KpiCard
            label="抽成圖像（獎勵）"
            done={stats.commissionDone}
            target={t.commissionTarget}
            unit="款"
            accent="bg-yellow-500"
            subtitle={`本月抽成金額：NT$ ${stats.commissionTotal.toLocaleString()}`}
          />
        </div>
      </section>

      {/* 接案 / 客製化（偶爾，不列入固定 KPI） */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-3">接案 / 客製化（偶爾）</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <KpiCard
            label="客製化手機殼"
            done={stats.customCaseCount}
            unit="件"
            subtitle={`本月客製訂單金額：NT$ ${stats.customCaseAmount.toLocaleString()}`}
          />
        </div>
      </section>

      {/* 夜市工時 vs KPI 取捨 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-3">夜市工時 vs KPI 取捨</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">夜市出勤</div>
            <div className="mt-2 text-3xl font-bold text-slate-800">
              {stats.shiftsAttended}
              <span className="text-lg text-slate-400"> / {stats.shiftsPlanned} 次</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">已出勤 {stats.marketHours} 小時</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">估算損失設計工時</div>
            <div className="mt-2 text-3xl font-bold text-amber-600">
              ≈ {lostDays} <span className="text-lg text-slate-400">工作天</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">以 8 小時/工作天估算</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">產能緩衝庫（備稿中）</div>
            <div className="mt-2 text-3xl font-bold text-slate-800">
              {stats.draftCount} <span className="text-lg text-slate-400">款</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">離峰提前備稿、削平月底高峰</div>
          </div>
        </div>

        {/* 取捨提示 */}
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            phaseReached
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {phaseReached ? (
            <>本月手機殼 KPI 已達標，且夜市出勤占用約 {lostDays} 個工作天 — 產能配置良好。</>
          ) : (
            <>
              本月手機殼 KPI 尚未達標（{stats.phoneCaseDone}/{t.phoneCaseTarget}），
              而夜市已占用約 {lostDays} 個工作天。建議主管評估：調整本月 KPI 目標、補強備稿庫，或調整夜市排班。
            </>
          )}
        </div>
      </section>

      {/* 跨月趨勢 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-3">跨月趨勢</h2>
        <MonthlyTrend />
      </section>
    </div>
  );
};
