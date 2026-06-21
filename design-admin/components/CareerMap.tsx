import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CAREER_LADDER, ALL_MILESTONE_IDS } from '../lib/career';

export const CareerMap: React.FC = () => {
  const {
    careerProgress,
    toggleMilestone,
    customGoals,
    addGoal,
    toggleGoal,
    removeGoal,
  } = useApp();

  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState('');

  // 整體進度
  const doneCount = ALL_MILESTONE_IDS.filter((id) => careerProgress[id]).length;
  const totalCount = ALL_MILESTONE_IDS.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // 每階段完成數，目前階段 = 第一個未全完成的階段
  const stageDone = (stageIdx: number) =>
    CAREER_LADDER[stageIdx].milestones.filter((m) => careerProgress[m.id]).length;
  const currentStageIdx = CAREER_LADDER.findIndex(
    (s, i) => stageDone(i) < s.milestones.length
  );

  const submitGoal = () => {
    if (!goalTitle.trim()) return;
    addGoal(goalTitle.trim(), goalDate || undefined);
    setGoalTitle('');
    setGoalDate('');
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* 總覽 */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-xl p-5">
        <div className="text-sm opacity-90">職涯方向 · 資深專業設計師</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{pct}%</span>
          <span className="text-sm opacity-80">
            里程碑 {doneCount} / {totalCount}
            {currentStageIdx >= 0 && ` · 目前階段：${CAREER_LADDER[currentStageIdx].title}`}
            {currentStageIdx < 0 && ' · 已完成全部階段 🎉'}
          </span>
        </div>
        <div className="mt-3 h-2 bg-white/25 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 階梯 */}
      <div className="space-y-4">
        {CAREER_LADDER.map((stage, idx) => {
          const done = stageDone(idx);
          const total = stage.milestones.length;
          const complete = done === total;
          const isCurrent = idx === currentStageIdx;
          return (
            <div
              key={stage.id}
              className={`bg-white rounded-xl border p-5 ${
                isCurrent ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    complete
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {complete ? '✓' : idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    {stage.title}
                    {isCurrent && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        目前階段
                      </span>
                    )}
                  </div>
                  {stage.subtitle && (
                    <div className="text-xs text-slate-400">{stage.subtitle}</div>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {done} / {total}
                </div>
              </div>

              <div className="space-y-1 pl-11">
                {stage.milestones.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-start gap-2 py-1 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={!!careerProgress[m.id]}
                      onChange={() => toggleMilestone(m.id)}
                      className="mt-0.5 w-4 h-4 accent-indigo-600"
                    />
                    <span
                      className={`text-sm ${
                        careerProgress[m.id]
                          ? 'text-slate-400 line-through'
                          : 'text-slate-700'
                      }`}
                    >
                      {m.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 自訂目標 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="font-semibold text-slate-800 mb-1">我的自訂目標</div>
        <div className="text-xs text-slate-400 mb-3">
          階梯之外、想額外達成的個人目標（例如：學會 3D 建模、開個人作品集網站）
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitGoal()}
            placeholder="新增一個目標…"
            className="flex-1 min-w-[180px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={goalDate}
            onChange={(e) => setGoalDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600"
          />
          <button
            onClick={submitGoal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
          >
            新增
          </button>
        </div>

        {customGoals.length === 0 ? (
          <div className="text-sm text-slate-400 py-2">尚無自訂目標</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customGoals.map((g) => (
              <div key={g.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={g.done}
                  onChange={() => toggleGoal(g.id)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span
                  className={`flex-1 text-sm ${
                    g.done ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                >
                  {g.title}
                </span>
                {g.targetDate && (
                  <span className="text-xs text-slate-400">目標 {g.targetDate}</span>
                )}
                <button
                  onClick={() => removeGoal(g.id)}
                  className="text-slate-300 hover:text-rose-500 text-sm px-1"
                  title="刪除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
