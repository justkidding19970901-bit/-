import React from 'react';
import type { Platform } from '../types';
import { downloadCSV, PLATFORM_META } from '../lib/csvExport';

interface Props {
  platform: Platform;
  csv: string;
  onClose: () => void;
}

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/**
 * Parses our generated CSV (RFC-4180-ish: CRLF, comma-separated, double-quote
 * escaping). Strips the BOM. Returns the first 50 rows so very large exports
 * don't freeze the table.
 */
function parseCSV(csv: string): ParsedCSV {
  const text = csv.replace(/^﻿/, ''); // strip BOM
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        cur.push(cell);
        cell = '';
      } else if (ch === '\r' && text[i + 1] === '\n') {
        cur.push(cell);
        rows.push(cur);
        cur = [];
        cell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        cur.push(cell);
        rows.push(cur);
        cur = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  const headers = rows[0] ?? [];
  return { headers, rows: rows.slice(1, 51) };
}

export const CsvPreview: React.FC<Props> = ({ platform, csv, onClose }) => {
  const { headers, rows } = parseCSV(csv);
  const meta = PLATFORM_META[platform];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" aria-label={`${meta.label} CSV 預覽`}
         onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full flex flex-col"
           onClick={e => e.stopPropagation()}>
        <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              ⬇️ {meta.label} 預覽
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              共 {headers.length} 欄 · 顯示前 50 筆 · 下載前先確認欄位是否符合官方範本
            </p>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none px-2"
            aria-label="關閉預覽">×</button>
        </header>

        <div className="flex-1 overflow-auto">
          <table className="text-xs border-collapse w-max">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 bg-slate-200 text-slate-500 font-mono">#</th>
                {headers.map((h, i) => (
                  <th key={i} className="border border-slate-300 px-2 py-1 text-left font-semibold text-slate-700 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-2 py-1 bg-slate-50 text-slate-400 font-mono">
                    {ri + 1}
                  </td>
                  {headers.map((_, ci) => (
                    <td key={ci} className="border border-slate-200 px-2 py-1 align-top whitespace-nowrap max-w-[220px] truncate"
                        title={row[ci] ?? ''}>
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-500">
            ⓘ 預覽用，實際下載含完整資料 · UTF-8 BOM
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-100 rounded">
              關閉
            </button>
            <button onClick={() => { downloadCSV(meta.filename, csv); onClose(); }}
              className={`px-4 py-1.5 text-sm font-bold text-white ${meta.color} rounded`}>
              ⬇ 下載 {meta.filename}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
