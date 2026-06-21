import React from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { dayLabel, weekendsOfMonth } from '../lib/period';

export const ShiftSchedule: React.FC = () => {
  const { selectedMonth, monthShifts, addShift, toggleAttended, removeShift } = useApp();
  const { success } = useToast();

  const weekends = weekendsOfMonth(selectedMonth);
  const shiftByDate = new Map(monthShifts.map((s) => [s.date, s]));

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500 mb-4">
        本月所有週末（六、日）夜市可排班日。標記「已出勤」後會計入 Dashboard 的夜市工時與損失工時估算。
      </p>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
        {weekends.map((date) => {
          const shift = shiftByDate.get(date);
          return (
            <div key={date} className="flex items-center gap-3 px-4 py-3">
              <div className="w-24 text-sm font-medium text-slate-700">{dayLabel(date)}</div>

              {shift ? (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shift.attended}
                      onChange={() => {
                        toggleAttended(shift.id);
                        if (!shift.attended) success('辛苦了，已記錄出勤');
                      }}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    已出勤
                  </label>
                  <span className="text-xs text-slate-400">{shift.hours} 小時</span>
                  {shift.note && <span className="text-xs text-slate-400">· {shift.note}</span>}
                  <div className="flex-1" />
                  <button
                    onClick={() => removeShift(shift.id)}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    移除排班
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-slate-300">未排班</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      addShift(date, 8, '夜市擺攤');
                      success('已排入夜市班表');
                    }}
                    className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg active:scale-95"
                  >
                    ＋ 排夜市（8 小時）
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
