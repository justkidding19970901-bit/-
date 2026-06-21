import React, { useState } from 'react';
import { WorkType } from '../types';
import { useApp } from '../context/AppContext';
import { WORK_TYPE_LABEL, WORK_TYPE_ORDER } from '../lib/labels';

interface Props {
  onClose: () => void;
}

export const WorkItemForm: React.FC<Props> = ({ onClose }) => {
  const { createWorkItem } = useApp();
  const [type, setType] = useState<WorkType>('phone_case');
  const [title, setTitle] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    createWorkItem({
      type,
      title: title.trim(),
      note: note.trim() || undefined,
      commissionAmount:
        type === 'commission' && commissionAmount ? Number(commissionAmount) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="text-lg font-semibold text-slate-800 mb-4">新增產出</div>

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

        {type === 'commission' && (
          <>
            <label className="block text-sm font-medium text-slate-600 mb-1">抽成金額（NT$）</label>
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
            新增
          </button>
        </div>
      </div>
    </div>
  );
};
