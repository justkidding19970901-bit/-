import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkItem, WorkStatus, WorkType } from '../types';
import {
  WORK_STATUS_LABEL,
  WORK_STATUS_ORDER,
  WORK_TYPE_LABEL,
  WORK_TYPE_ORDER,
  WORK_TYPE_STYLE,
} from '../lib/labels';
import { WorkItemForm } from './WorkItemForm';
import { StatusMenu } from './StatusMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '../context/ToastContext';

export const WorkItemList: React.FC = () => {
  const { monthItems, stats, setWorkItemStatus, deleteWorkItem, isManager } = useApp();
  const { success, celebrate } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WorkItem | null>(null);
  const [deleting, setDeleting] = useState<WorkItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorkType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');

  const filtered = monthItems.filter(
    (w) =>
      (typeFilter === 'all' || w.type === typeFilter) &&
      (statusFilter === 'all' || w.status === statusFilter)
  );

  const handleStatus = (w: WorkItem, s: WorkStatus) => {
    if (s === w.status) return;
    setWorkItemStatus(w.id, s);
    if (s === 'done' && w.status !== 'done') {
      const t = stats.target.phoneCaseTarget;
      const willReach =
        w.type === 'phone_case' && stats.phoneCaseDone < t && stats.phoneCaseDone + 1 >= t;
      if (willReach) celebrate('本月手機殼 KPI 達標，太棒了！');
      else success(`完成一項：${w.title}`);
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteWorkItem(deleting.id);
    success('已刪除');
    setDeleting(null);
  };

  return (
    <div>
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as WorkType | 'all')}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-white"
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
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-white"
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
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm shadow-sm hover:shadow active:scale-95"
        >
          ＋ 新增產出
        </button>
      </div>

      {/* 清單 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-2">🎨</div>
          <div className="text-slate-500 text-sm mb-4">
            {monthItems.length === 0 ? '這個月還沒有產出，從第一件開始吧！' : '沒有符合篩選條件的產出'}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm active:scale-95"
          >
            ＋ 立即新增
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          {filtered.map((w) => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-soft">
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${WORK_TYPE_STYLE[w.type]}`}>
                {WORK_TYPE_LABEL[w.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">{w.title}</div>
                {w.commissionAmount ? (
                  <div className="text-xs text-yellow-700">
                    {w.type === 'custom_case' ? '客製金額' : '抽成'} NT$ {w.commissionAmount.toLocaleString()}
                  </div>
                ) : null}
                {w.note && <div className="text-xs text-slate-400 truncate">{w.note}</div>}
              </div>

              <StatusMenu value={w.status} onChange={(s) => handleStatus(w, s)} />

              <button
                onClick={() => setEditItem(w)}
                className="text-slate-300 hover:text-indigo-500 text-sm px-1"
                title="編輯"
              >
                ✎
              </button>

              {isManager && (
                <button
                  onClick={() => setDeleting(w)}
                  className="text-slate-300 hover:text-rose-500 text-sm px-1"
                  title="刪除"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <WorkItemForm onClose={() => setShowForm(false)} />}
      {editItem && <WorkItemForm editItem={editItem} onClose={() => setEditItem(null)} />}
      {deleting && (
        <ConfirmDialog
          title="確定刪除這項產出？"
          message={`「${deleting.title}」刪除後無法復原。`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
};
