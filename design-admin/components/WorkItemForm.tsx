import React, { useState } from 'react';
import { WorkItem, WorkType } from '../types';
import { useApp } from '../context/AppContext';
import { AMOUNT_LABEL, AMOUNT_TYPES, WORK_TYPE_LABEL, WORK_TYPE_ORDER } from '../lib/labels';

interface Props {
  onClose: () => void;
  editItem?: WorkItem; // 有值 → 編輯模式
}

export const WorkItemForm: React.FC<Props> = ({ onClose, editItem }) => {
  const { createWorkItem, updateWorkItem } = useApp();
  const isEdit = !!editItem;

  const [type, setType] = useState<WorkType>(editItem?.type ?? 'phone_case');
  const [title, setTitle] = useState(editItem?.title ?? '');
  const [commissionAmount, setCommissionAmount] = useState(
    editItem?.commissionAmount != null ? String(editItem.commissionAmount) : ''
  );
  const [note, setNote] = useState(editItem?.note ?? '');

  const hasAmount = AMOUNT_TYPES.includes(type);

  const submit = () => {
    if (!title.trim()) return;
    const amount = hasAmount && commissionAmount ? Number(commissionAmount) : undefined;
    if (isEdit) {
      updateWorkItem(editItem!.id, {
        type,
        title: title.trim(),
        note: note.trim() || undefined,
        commissionAmount: amount,
      });
    } else {
      createWorkItem({
        type,
        title: title.trim(),
        note: note.trim() || undefined,
        commissionAmount: amount,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="text-lg font-semibold text-slate-800 mb-4">
          {isEdit ? '編輯產出' : '新增產出'}
        </div>

        <label className="block text-sm font-medium text-slate-600 mb-1">類型</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as WorkType)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4"
        >
          {WORK_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {WORK_TYPE_LABEL[t]}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-slate-600 mb-1">標題</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：眾川赴海（日系浪潮）"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4"
        />

        {hasAmount && (
          <>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {AMOUNT_LABEL[type]}
            </label>
            <input
              type="number"
              value={commissionAmount}
              onChange={(e) => setCommissionAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4"
            />
          </>
        )}

        <label className="block text-sm font-medium text-slate-600 mb-1">備註（選填）</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-5"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            {isEdit ? '儲存' : '新增'}
          </button>
        </div>
      </div>
    </div>
  );
};
