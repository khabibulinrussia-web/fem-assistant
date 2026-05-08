'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/supabase-client';
import type { Project } from '@/lib/supabase-client';

type Tab = 'pnl' | 'cf' | 'bs' | 'ratios';

const tabs: { key: Tab; label: string }[] = [
  { key: 'pnl', label: 'P&L (Прибыль)' },
  { key: 'cf', label: 'Cash Flow (ДДС)' },
  { key: 'bs', label: 'Balance Sheet' },
  { key: 'ratios', label: 'Коэффициенты' },
];

interface SheetRow {
  name: string;
  values: number[];
}

interface CalcResult {
  pnl: { pnl: { rows: SheetRow[] } };
  cashflow: { cashflow: { rows: SheetRow[] } };
  balance_sheet: { balance_sheet: { rows: SheetRow[] } };
  ratios: { ratios: string };
  break_even: { break_even?: { rows?: SheetRow[] } };
  assumptions?: Record<string, number>;
}

function fmt(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return n.toLocaleString('ru-RU');
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function buildRows(data: Record<string, number[]>): SheetRow[] {
  return Object.entries(data || {}).map(([name, values]) => ({
    name,
    values: values || [],
  }));
}

function sumYear(values: number[], start: number, count: number): number {
  return values.slice(start, start + count).reduce((a, b) => a + b, 0);
}

export default function ResultsPage() {
  const params = useParams();
  const [tab, setTab] = useState<Tab>('pnl');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);

  useEffect(() => {
    calculate();
  }, []);

  async function calculate() {
    try {
      setLoading(true);
      setError(null);
      const project = await getProject(params.id as string);
      const assumptions = project.assumptions || {};

      // Call the API
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Ошибка расчёта');
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  function renderTable(data: Record<string, number[]> | undefined, yearCount = 3) {
    if (!data) {
      return <p className="text-gray-500 p-6 text-center">Нет данных</p>;
    }

    const rows = buildRows(data);
    const monthRanges = yearCount === 1
      ? [{ label: 'Год', start: 0, count: 12 }]
      : [
        { label: 'Год 1', start: 0, count: 12 },
        { label: 'Год 2', start: 12, count: 12 },
        { label: 'Год 3', start: 24, count: 12 },
      ];

    // Add totals row
    const totalsRow: SheetRow = {
      name: 'Всего',
      values: rows.length > 0
        ? rows[0].values.map((_, i) => rows.reduce((sum, r) => sum + (r.values[i] || 0), 0))
        : [],
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Показатель</th>
              {monthRanges.map((r) => (
                <th key={r.label} className="text-right px-4 py-3 font-medium text-gray-700">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.concat(totalsRow).map((row, ri) => {
              const isSection = row.values.length === 0;
              const isTotal = row.name === 'Всего';
              return (
                <tr key={ri} className={`border-b border-gray-100 last:border-0 ${isSection ? 'bg-gray-50' : ''} ${isTotal ? 'bg-blue-50 font-semibold' : ''}`}>
                  <td className={`px-4 py-2 ${isSection ? 'text-xs uppercase tracking-wider text-blue-800 font-semibold' : 'text-gray-900'}`}>
                    {row.name}
                  </td>
                  {monthRanges.map((r) => {
                    const val = sumYear(row.values, r.start, r.count);
                    return (
                      <td key={r.label} className={`px-4 py-2 text-right tabular-nums ${isSection ? 'text-gray-500' : isTotal ? 'text-blue-800' : 'text-gray-700'}`}>
                        {row.name.toLowerCase().includes('рентабельность') || row.name.startsWith('ROE') || row.name.startsWith('ROS') || row.name.startsWith('GPM') || row.name.startsWith('OPM')
                          ? fmtPct(val)
                          : fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={calculate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Повторить</button>
        </div>
      </div>
    );
  }

  const pnlData = result?.pnl?.pnl?.rows ? Object.fromEntries(
    (result.pnl.pnl.rows || []).map((r: SheetRow) => [r.name, r.values])
  ) : undefined;

  const cfData = result?.cashflow?.cashflow?.rows ? Object.fromEntries(
    (result.cashflow.cashflow.rows || []).map((r: SheetRow) => [r.name, r.values])
  ) : undefined;

  const bsData = result?.balance_sheet?.balance_sheet?.rows ? Object.fromEntries(
    (result.balance_sheet.balance_sheet.rows || []).map((r: SheetRow) => [r.name, r.values])
  ) : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">←</Link>
            <h1 className="text-lg font-semibold text-gray-900">Результаты</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/project/${params.id}/assumptions`} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Редактировать данные
            </Link>
            <button onClick={() => {}} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              📥 Excel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition ${
                tab === t.key ? 'bg-blue-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'pnl' && renderTable(pnlData)}
        {tab === 'cf' && renderTable(cfData)}
        {tab === 'bs' && renderTable(bsData)}
        {tab === 'ratios' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{typeof result?.ratios === 'string' ? result.ratios : (result?.ratios as any)?.ratios || ''}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
