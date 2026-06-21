import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastKind = 'info' | 'success' | 'celebrate';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  celebrate: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ICON: Record<ToastKind, string> = {
  info: '💬',
  success: '✅',
  celebrate: '🎉',
};

const STYLE: Record<ToastKind, string> = {
  info: 'bg-slate-800 text-white',
  success: 'bg-emerald-600 text-white',
  celebrate: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, kind === 'celebrate' ? 3200 : 2400);
  }, []);

  const api: ToastApi = {
    toast: push,
    success: (m) => push(m, 'success'),
    celebrate: (m) => push(m, 'celebrate'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium ${STYLE[t.kind]}`}
          >
            <span className={t.kind === 'celebrate' ? 'animate-pop' : ''}>{ICON[t.kind]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
