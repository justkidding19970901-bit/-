import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KpiTarget, Member, Shift, WorkItem, WorkStatus, WorkType } from '../types';
import * as store from '../lib/storage';
import { currentMonth, dateMonth } from '../lib/period';
import { uid } from '../lib/id';

export interface MonthStats {
  phoneCaseDone: number;
  productImageDone: number;
  ecommerceImageDone: number;
  commissionDone: number;
  commissionTotal: number; // 抽成總金額
  shiftsPlanned: number;
  shiftsAttended: number;
  marketHours: number;     // 夜市占用時數（已出勤）
  draftCount: number;      // 備稿庫數量
  target: KpiTarget;
}

interface AppContextValue {
  // session / 角色
  currentUser: Member | null;
  isManager: boolean;
  login: (memberId: string, passcode?: string) => { ok: boolean; error?: string };
  logout: () => void;

  // 月份視角
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;

  // 資料
  members: Member[];
  workItems: WorkItem[];
  shifts: Shift[];
  kpiTargets: KpiTarget[];

  // 衍生
  monthItems: WorkItem[];
  monthShifts: Shift[];
  stats: MonthStats;
  statsForMonth: (month: string) => MonthStats;

  // 操作 — 產出
  createWorkItem: (data: Pick<WorkItem, 'type' | 'title'> & Partial<WorkItem>) => void;
  updateWorkItem: (id: string, patch: Partial<WorkItem>) => void;
  setWorkItemStatus: (id: string, status: WorkStatus) => void;
  deleteWorkItem: (id: string) => void;

  // 操作 — 排班
  addShift: (date: string, hours: number, note?: string) => void;
  toggleAttended: (id: string) => void;
  removeShift: (id: string) => void;

  // 操作 — KPI 目標（主管）
  setKpiTarget: (target: KpiTarget) => void;

  // 操作 — 成員（主管）
  addMember: (name: string, role: Member['role']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const DONE: WorkStatus = 'done';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());

  // 初始化：種子 + 載入
  useEffect(() => {
    store.seedIfEmpty();
    const m = store.getMembers();
    setMembers(m);
    setWorkItems(store.getWorkItems());
    setShifts(store.getShifts());
    setKpiTargets(store.getKpiTargets());
    const session = store.getSession();
    if (session) {
      const user = m.find((x) => x.id === session.memberId) ?? null;
      setCurrentUser(user);
    }
  }, []);

  // ---- session ----
  const login = useCallback(
    (memberId: string, passcode?: string) => {
      const member = members.find((x) => x.id === memberId);
      if (!member) return { ok: false, error: '找不到成員' };
      if (member.role === 'manager' && passcode !== store.MANAGER_PASSCODE) {
        return { ok: false, error: '主管通行碼錯誤' };
      }
      store.saveSession({ memberId });
      setCurrentUser(member);
      return { ok: true };
    },
    [members]
  );

  const logout = useCallback(() => {
    store.saveSession(null);
    setCurrentUser(null);
  }, []);

  // ---- 產出 ----
  const persistItems = useCallback((next: WorkItem[]) => {
    setWorkItems(next);
    store.saveWorkItems(next);
  }, []);

  const createWorkItem: AppContextValue['createWorkItem'] = useCallback(
    (data) => {
      const now = new Date().toISOString();
      const item: WorkItem = {
        id: uid('w_'),
        month: selectedMonth,
        status: 'in_progress',
        type: data.type,
        title: data.title,
        commissionAmount: data.commissionAmount,
        note: data.note,
        createdAt: now,
        updatedAt: now,
      };
      persistItems([item, ...workItems]);
    },
    [workItems, selectedMonth, persistItems]
  );

  const updateWorkItem = useCallback(
    (id: string, patch: Partial<WorkItem>) => {
      const now = new Date().toISOString();
      persistItems(
        workItems.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: now } : w))
      );
    },
    [workItems, persistItems]
  );

  const setWorkItemStatus = useCallback(
    (id: string, status: WorkStatus) => {
      const now = new Date().toISOString();
      persistItems(
        workItems.map((w) =>
          w.id === id
            ? { ...w, status, updatedAt: now, doneAt: status === DONE ? now : undefined }
            : w
        )
      );
    },
    [workItems, persistItems]
  );

  const deleteWorkItem = useCallback(
    (id: string) => persistItems(workItems.filter((w) => w.id !== id)),
    [workItems, persistItems]
  );

  // ---- 排班 ----
  const persistShifts = useCallback((next: Shift[]) => {
    setShifts(next);
    store.saveShifts(next);
  }, []);

  const addShift = useCallback(
    (date: string, hours: number, note?: string) => {
      if (shifts.some((s) => s.date === date)) return; // 同日不重複
      const shift: Shift = { id: uid('s_'), date, attended: false, hours, note };
      persistShifts([...shifts, shift].sort((a, b) => a.date.localeCompare(b.date)));
    },
    [shifts, persistShifts]
  );

  const toggleAttended = useCallback(
    (id: string) =>
      persistShifts(shifts.map((s) => (s.id === id ? { ...s, attended: !s.attended } : s))),
    [shifts, persistShifts]
  );

  const removeShift = useCallback(
    (id: string) => persistShifts(shifts.filter((s) => s.id !== id)),
    [shifts, persistShifts]
  );

  // ---- KPI 目標 ----
  const setKpiTarget = useCallback(
    (target: KpiTarget) => {
      const next = kpiTargets.some((t) => t.month === target.month)
        ? kpiTargets.map((t) => (t.month === target.month ? target : t))
        : [...kpiTargets, target];
      setKpiTargets(next);
      store.saveKpiTargets(next);
    },
    [kpiTargets]
  );

  // ---- 成員 ----
  const addMember = useCallback(
    (name: string, role: Member['role']) => {
      const next = [...members, { id: uid('m_'), name, role, active: true }];
      setMembers(next);
      store.saveMembers(next);
    },
    [members]
  );

  // ---- 衍生統計 ----
  const monthItems = useMemo(
    () => workItems.filter((w) => w.month === selectedMonth),
    [workItems, selectedMonth]
  );
  const monthShifts = useMemo(
    () => shifts.filter((s) => dateMonth(s.date) === selectedMonth),
    [shifts, selectedMonth]
  );

  const statsForMonth = useCallback(
    (month: string): MonthStats => {
      const items = workItems.filter((w) => w.month === month);
      const sh = shifts.filter((s) => dateMonth(s.date) === month);
      const doneOf = (type: WorkType) =>
        items.filter((w) => w.type === type && w.status === DONE).length;
      const attended = sh.filter((s) => s.attended);
      return {
        phoneCaseDone: doneOf('phone_case'),
        productImageDone: doneOf('product_image'),
        ecommerceImageDone: doneOf('ecommerce_image'),
        commissionDone: doneOf('commission'),
        commissionTotal: items
          .filter((w) => w.type === 'commission')
          .reduce((sum, w) => sum + (w.commissionAmount ?? 0), 0),
        shiftsPlanned: sh.length,
        shiftsAttended: attended.length,
        marketHours: attended.reduce((sum, s) => sum + (s.hours ?? 0), 0),
        draftCount: items.filter((w) => w.status === 'draft').length,
        target: store.targetForMonth(kpiTargets, month),
      };
    },
    [workItems, shifts, kpiTargets]
  );

  const stats: MonthStats = useMemo(
    () => statsForMonth(selectedMonth),
    [statsForMonth, selectedMonth]
  );

  const value: AppContextValue = {
    currentUser,
    isManager: currentUser?.role === 'manager',
    login,
    logout,
    selectedMonth,
    setSelectedMonth,
    members,
    workItems,
    shifts,
    kpiTargets,
    monthItems,
    monthShifts,
    stats,
    statsForMonth,
    createWorkItem,
    updateWorkItem,
    setWorkItemStatus,
    deleteWorkItem,
    addShift,
    toggleAttended,
    removeShift,
    setKpiTarget,
    addMember,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
