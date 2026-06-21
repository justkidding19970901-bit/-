import React, { useState } from 'react';
import { WorkStatus } from '../types';
import { WORK_STATUS_LABEL, WORK_STATUS_ORDER, WORK_STATUS_STYLE } from '../lib/labels';

interface Props {
  value: WorkStatus;
  onChange: (s: WorkStatus) => void;
}

// 點選式狀態切換（取代原生下拉，更直覺）
export const StatusMenu: React.FC<Props> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-xs px-2.5 py-1 rounded-full font-medium hover:brightness-95 ${WORK_STATUS_STYLE[value]}`}
      >
        {WORK_STATUS_LABEL[value]} ▾
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-100 p-1 animate-fade-in min-w-[100px]">
            {WORK_STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 ${
                  s === value ? 'font-semibold' : 'text-slate-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${WORK_STATUS_STYLE[s].split(' ')[0]}`} />
                {WORK_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
