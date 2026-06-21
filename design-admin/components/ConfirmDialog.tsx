import React from 'react';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({
  title,
  message,
  confirmLabel = '確認刪除',
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[90] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold text-slate-800 mb-1">{title}</div>
        {message && <div className="text-sm text-slate-500 mb-5">{message}</div>}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
