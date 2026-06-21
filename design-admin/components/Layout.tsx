import React from 'react';
import { useApp } from '../context/AppContext';
import { monthLabel, shiftMonth } from '../lib/period';

export type PageKey =
  | 'dashboard'
  | 'work'
  | 'shifts'
  | 'checklist'
  | 'specs'
  | 'career'
  | 'kpi'
  | 'members';

interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
  managerOnly?: boolean;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: '統合儀表', icon: '📊' },
  { key: 'work', label: '產出清單', icon: '🎨' },
  { key: 'shifts', label: '夜市排班', icon: '🏮' },
  { key: 'checklist', label: '詳情頁檢查清單', icon: '✅' },
  { key: 'specs', label: '上架圖規格', icon: '📐' },
  { key: 'career', label: '職涯地圖', icon: '🧭' },
  { key: 'kpi', label: 'KPI 目標設定', icon: '🎯', managerOnly: true },
  { key: 'members', label: '成員管理', icon: '👥', managerOnly: true },
];

interface Props {
  active: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ active, onNavigate, children }) => {
  const { currentUser, isManager, logout, selectedMonth, setSelectedMonth } = useApp();
  const nav = NAV.filter((n) => !n.managerOnly || isManager);

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700/60">
          <div className="font-bold text-white">Designer Studio</div>
          <div className="text-xs text-slate-400 mt-0.5">MonnaCase 墨盾 · 設計部</div>
        </div>
        <nav className="flex-1 py-3">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => onNavigate(n.key)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active === n.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-700/60">
          <div className="text-sm text-white">{currentUser?.name}</div>
          <div className="text-xs text-slate-400 mb-2">{isManager ? '主管' : '設計師'}</div>
          <button
            onClick={logout}
            className="text-xs text-slate-300 hover:text-white underline"
          >
            登出
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with month picker */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="text-lg font-semibold text-slate-800">
            {NAV.find((n) => n.key === active)?.label}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              ‹
            </button>
            <div className="text-sm font-medium text-slate-700 w-28 text-center">
              {monthLabel(selectedMonth)}
            </div>
            <button
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              ›
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};
