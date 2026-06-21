import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DETAIL_CHECKLIST } from '../lib/storage';
import { WORK_TYPE_LABEL } from '../lib/labels';

// 進度以 localStorage 直接存（輕量、與主資料分離），key 綁定產出 id
const keyFor = (itemId: string) => `design-admin:checklist:${itemId}`;

export const DetailPageChecklist: React.FC = () => {
  const { monthItems } = useApp();
  const targets = monthItems.filter((w) => w.type === 'ecommerce_image');

  const [selectedId, setSelectedId] = useState<string>(targets[0]?.id ?? '');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // 切換產出時載入其進度
  useEffect(() => {
    if (!selectedId) {
      setChecked({});
      return;
    }
    try {
      const raw = localStorage.getItem(keyFor(selectedId));
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [selectedId]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    if (selectedId) localStorage.setItem(keyFor(selectedId), JSON.stringify(next));
  };

  const doneCount = DETAIL_CHECKLIST.filter((c) => checked[c.id]).length;
  const allDone = doneCount === DETAIL_CHECKLIST.length;

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500 mb-4">
        對應效率報告對策 C：詳情頁上架前逐項勾選，避免來回補圖。選一個「電商上架圖/詳情頁」產出來追蹤。
      </p>

      {targets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-sm text-slate-400">
          本月尚無「{WORK_TYPE_LABEL.ecommerce_image}」產出。請先到「產出清單」新增。
        </div>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white mb-4 w-full max-w-md"
          >
            {targets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div
              className={`px-4 py-2.5 text-sm font-medium ${
                allDone ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'
              }`}
            >
              完成度 {doneCount} / {DETAIL_CHECKLIST.length}
              {allDone && ' · 可上架 ✅'}
            </div>
            <div className="divide-y divide-slate-100">
              {DETAIL_CHECKLIST.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={!!checked[c.id]}
                    onChange={() => toggle(c.id)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span
                    className={`text-sm ${
                      checked[c.id] ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}
                  >
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
