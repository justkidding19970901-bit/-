import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkStatus, WorkType } from '../types';
import {
  WORK_STATUS_LABEL,
  WORK_STATUS_ORDER,
  WORK_STATUS_STYLE,
  WORK_TYPE_LABEL,
  WORK_TYPE_ORDER,
  WORK_TYPE_STYLE,
} from '../lib/labels';
import { WorkItemForm } from './WorkItemForm';

export const WorkItemList: React.FC = () => {
  const { monthItems, setWorkItemStatus, deleteWorkItem, isManager } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<WorkType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');

  const filtered = monthItems.filter(
    (w) =>
      (typeFilter === 'all' || w.type === typeFilter) &&
      (statusFilter === 'all' || w.status === statusFilter)
  );

  return (
    <div>
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as WorkType | 'all')}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="all">全部類型</option>
          {WORK_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {WORK_TYPE_LABEL[t]}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as WorkStatus | 'all')}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="all">全部狀態</option>
          {WORK_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {WORK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <div className="flex-1" />
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
        >
          + 新增產出
        </button>
      </div>

      {/* 清單 */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">本月尚無符合條件的產出</div>
        )}
        {filtered.map((w) => (
          <div key={w.id} className="flex items-center gap-3 px-4 py-3">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${WORK_TYPE_STYLE[w.type]}`}>
              {WORK_TYPE_LABEL[w.type]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">{w.title}</div>
              {w.type === 'commission' && w.commissionAmount ? (
                <div className="text-xs text-yellow-700">抽成 NT$ {w.commissionAmount.toLocaleString()}</div>
              ) : null}
              {w.note && <div className="text-xs text-slate-400 truncate">{w.note}</div>}
            </div>

            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${WORK_STATUS_STYLE[w.status]}`}>
              {WORK_STATUS_LABEL[w.status]}
            </span>

            <select
              value={w.status}
              onChange={(e) => setWorkItemStatus(w.id, e.target.value as WorkStatus)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
            >
              {WORK_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {WORK_STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            {isManager && (
              <button
                onClick={() => deleteWorkItem(w.id)}
                className="text-slate-300 hover:text-rose-500 text-sm px-1"
                title="刪除"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && <WorkItemForm onClose={() => setShowForm(false)} />}
    </div>
  );
};
