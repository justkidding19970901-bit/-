import React from 'react';
import { LISTING_SPECS } from '../lib/storage';

export const ListingSpecRef: React.FC = () => {
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-slate-500 mb-4">
        對應效率報告對策 B：iPhone 16 Pro / 17 Pro 上架圖固定尺寸規格，搭配 PS 動作（Action）/ Export As
        預設一次匯出，避免每款手動另存改尺寸。數值為預設，請設計師依實際校正。
      </p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-2.5 font-medium">用途</th>
              <th className="px-4 py-2.5 font-medium">尺寸</th>
              <th className="px-4 py-2.5 font-medium">格式</th>
              <th className="px-4 py-2.5 font-medium">備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {LISTING_SPECS.map((s, i) => (
              <tr key={i} className="text-slate-700">
                <td className="px-4 py-3 font-medium">{s.label}</td>
                <td className="px-4 py-3">{s.size}</td>
                <td className="px-4 py-3 text-slate-500">{s.format}</td>
                <td className="px-4 py-3 text-slate-400">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-400">
        提示：把上表做成 PS 的「Export As」批次預設或 Action，新款主圖以智慧物件替換後即可一鍵輸出全部尺寸。
      </div>
    </div>
  );
};
