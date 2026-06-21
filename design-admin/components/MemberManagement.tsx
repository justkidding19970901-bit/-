import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Role } from '../types';

export const MemberManagement: React.FC = () => {
  const { members, addMember } = useApp();
  const { success } = useToast();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('designer');

  const submit = () => {
    if (!name.trim()) return;
    addMember(name.trim(), role);
    success(`已新增成員：${name.trim()}`);
    setName('');
    setRole('designer');
  };

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500 mb-4">
        管理可登入的成員。目前設計部以單一設計師為主，未來擴編時可在此新增成員。
      </p>

      {/* 新增 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-slate-600 mb-1">姓名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">角色</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="designer">設計師</option>
            <option value="manager">主管</option>
          </select>
        </div>
        <button
          onClick={submit}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          新增成員
        </button>
      </div>

      {/* 清單 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <span className="font-medium text-slate-700">{m.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                m.role === 'manager' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
              }`}
            >
              {m.role === 'manager' ? '主管' : '設計師'}
            </span>
            <div className="flex-1" />
            <span className={`text-xs ${m.active ? 'text-emerald-600' : 'text-slate-400'}`}>
              {m.active ? '啟用中' : '已停用'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
