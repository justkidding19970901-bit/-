import React, { useEffect, useRef, useState } from 'react';

type ActionVariant = 'default' | 'primary' | 'destructive';

interface RawAction {
  label: string;
  value: unknown;
  variant?: ActionVariant;
}

interface Request {
  id: number;
  title: string;
  body?: string;
  input?: { placeholder?: string; defaultValue?: string; type?: string };
  actions: RawAction[];
  resolve: (result: { actionValue: unknown; inputValue: string | null }) => void;
}

let nextId = 1;
let current: Request | null = null;
let listeners: Array<(req: Request | null) => void> = [];

function setCurrent(req: Request | null) {
  current = req;
  for (const l of listeners) l(current);
}

function show(opts: Omit<Request, 'id' | 'resolve'>): Promise<{ actionValue: unknown; inputValue: string | null }> {
  // If a dialog is already showing, drop it (resolve as if first action — usually cancel).
  if (current) {
    current.resolve({ actionValue: current.actions[0]?.value ?? null, inputValue: null });
  }
  return new Promise(resolve => {
    setCurrent({ ...opts, id: nextId++, resolve });
  });
}

export function showAlert(opts: { title: string; body?: string; okText?: string }): Promise<void> {
  return show({
    title: opts.title,
    body: opts.body,
    actions: [{ label: opts.okText ?? '好', value: true, variant: 'primary' }],
  }).then(() => undefined);
}

export function showConfirm(opts: {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return show({
    title: opts.title,
    body: opts.body,
    actions: [
      { label: opts.cancelText ?? '取消', value: false, variant: 'default' },
      {
        label: opts.confirmText ?? '確定',
        value: true,
        variant: opts.destructive ? 'destructive' : 'primary',
      },
    ],
  }).then(r => r.actionValue === true);
}

export function showPrompt(opts: {
  title: string;
  body?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<string | null> {
  return show({
    title: opts.title,
    body: opts.body,
    input: { placeholder: opts.placeholder, defaultValue: opts.defaultValue ?? '' },
    actions: [
      { label: opts.cancelText ?? '取消', value: 'cancel', variant: 'default' },
      { label: opts.confirmText ?? '確定', value: 'ok', variant: 'primary' },
    ],
  }).then(r => (r.actionValue === 'ok' ? r.inputValue ?? '' : null));
}

export interface ChoiceAction<T> {
  label: string;
  value: T;
  variant?: ActionVariant;
}

export function showChoice<T extends string | number>(opts: {
  title: string;
  body?: string;
  actions: ChoiceAction<T>[];
  cancelText?: string;
}): Promise<T | null> {
  return show({
    title: opts.title,
    body: opts.body,
    actions: [
      { label: opts.cancelText ?? '取消', value: null, variant: 'default' },
      ...opts.actions,
    ],
  }).then(r => r.actionValue as T | null);
}

export const DialogHost: React.FC = () => {
  const [req, setReq] = useState<Request | null>(null);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = (r: Request | null) => {
      setReq(r);
      setInputVal(r?.input?.defaultValue ?? '');
    };
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(l => l !== fn);
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    if (req.input) {
      // Defer focus until after the modal mounts
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [req]);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(req.actions[0].value);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Only auto-submit on Enter when input present OR no input + we have a primary action
        const last = req.actions[req.actions.length - 1];
        if (last) {
          e.preventDefault();
          finish(last.value);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req, inputVal]);

  const finish = (actionValue: unknown) => {
    if (!req) return;
    req.resolve({ actionValue, inputValue: req.input ? inputVal : null });
    setCurrent(null);
  };

  if (!req) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[3px] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={() => finish(req.actions[0].value)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4">
          <h3
            id="dialog-title"
            className="text-base font-semibold text-slate-900 leading-snug text-center"
          >
            {req.title}
          </h3>
          {req.body && (
            <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed whitespace-pre-line text-center">
              {req.body}
            </p>
          )}
          {req.input && (
            <input
              ref={inputRef}
              type={req.input.type ?? 'text'}
              placeholder={req.input.placeholder}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          )}
        </div>
        <div className="flex border-t border-slate-200">
          {req.actions.map((a, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="w-px bg-slate-200" aria-hidden />}
              <button
                type="button"
                onClick={() => finish(a.value)}
                className={`flex-1 py-3 text-[15px] transition ${
                  a.variant === 'destructive'
                    ? 'text-rose-600 font-semibold hover:bg-rose-50 active:bg-rose-100'
                    : a.variant === 'primary'
                      ? 'text-indigo-600 font-semibold hover:bg-indigo-50 active:bg-indigo-100'
                      : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                {a.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
