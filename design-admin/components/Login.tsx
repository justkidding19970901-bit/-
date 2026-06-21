import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Login: React.FC = () => {
  const { members, login } = useApp();
  const [selected, setSelected] = useState<string>('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const activeMembers = members.filter((m) => m.active);
  const selectedMember = members.find((m) => m.id === selected);
  const needPasscode = selectedMember?.role === 'manager';

  const handleLogin = () => {
    setError('');
    if (!selected) {
      setError('請先選擇身分');
      return;
    }
    const res = login(selected, passcode);
    if (!res.ok) setError(res.error ?? '登入失敗');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🎨</div>
          <div className="text-2xl font-bold text-slate-800">Designer Studio</div>
          <div className="text-sm text-slate-400 mt-1">MonnaCase 墨盾 · 設計部</div>
        </div>

        <label className="block text-sm font-medium text-slate-600 mb-2">選擇身分登入</label>
        <div className="space-y-2 mb-4">
          {activeMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelected(m.id);
                setError('');
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${
                selected === m.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium text-slate-700">{m.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  m.role === 'manager' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                }`}
              >
                {m.role === 'manager' ? '主管' : '設計師'}
              </span>
            </button>
          ))}
        </div>

        {needPasscode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">主管通行碼</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="預設為 admin"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}

        {error && <div className="text-sm text-rose-600 mb-3">{error}</div>}

        <button
          onClick={handleLogin}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-2xl shadow-sm hover:shadow active:scale-[0.98]"
        >
          登入
        </button>
      </div>
    </div>
  );
};
