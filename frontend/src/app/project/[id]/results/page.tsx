'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/supabase-client';

// Map frontend assumption keys (camelCase) to API keys (snake_case)
const ASSUMPTION_MAP: Record<string, string> = {
  targetRevenue: 'target_revenue_per_day',
  avgOrderValue: 'avg_check',
  ordersPerDay: 'orders_per_day',
  growthRate: undefined as any, // unused in engine
  cogsPercent: 'cost_per_orders', // will be computed
  payroll: 'payroll',
  rent: 'rent',
  marketing: 'marketing',
  acquiringPercent: 'acquiring_pct',
  logisticsPerOrder: 'logistics_per_order',
  taxSystem: 'tax_system',
  taxRate: 'tax_rate',
  regIP: 'reg_ip',
  equipment: 'equipment',
  website: 'website',
  reserveFund: 'reserve_fund',
  rampMonth1: 'ramp_month_1',
  rampMonth2: 'ramp_month_2',
  rampMonth3: 'ramp_month_3',
};

function mapAssumptions(raw: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  // Required API fields with defaults
  mapped['target_revenue_per_day'] = 320;
  mapped['avg_check'] = 700;
  mapped['orders_per_day'] = 15;
  mapped['cost_per_order'] = 0;
  mapped['acquiring_pct'] = 1.5;
  mapped['payroll'] = 9000;
  mapped['marketing'] = 0;
  mapped['rent'] = 0;
  mapped['other_expenses'] = 0;
  mapped['logistics_per_order'] = 0;
  mapped['tax_system'] = 'USN_15';
  mapped['tax_rate'] = 0.15;
  mapped['reg_ip'] = 5000;
  mapped['equipment'] = 50000;
  mapped['website'] = 0;
  mapped['reserve_fund'] = 0;
  mapped['ramp_month_1'] = 0.85;
  mapped['ramp_month_2'] = 0.90;
  mapped['ramp_month_3'] = 1.0;
  mapped['inventory_days'] = 0;
  mapped['supplier_deferral'] = 0;
  mapped['customer_deferral'] = 0;

  if (!raw) return mapped;

  // Map known camelCase keys
  for (const [camel, snake] of Object.entries(ASSUMPTION_MAP)) {
    if (!snake) continue;
    if (raw[camel] !== undefined) {
      if (camel === 'taxSystem') {
        // Convert 'УСН 15%' → 'USN_15'
        const v = String(raw[camel]);
        if (v.includes('6')) mapped[snake] = 'USN_6';
        else if (v.includes('15')) mapped[snake] = 'USN_15';
        else mapped[snake] = 'OSNO';
      } else if (camel === 'taxRate') {
        // Convert percent to decimal
        mapped[snake] = Number(raw[camel]) / 100;
      } else if (camel === 'acquiringPercent') {
        mapped[snake] = Number(raw[camel]);
      } else if (camel === 'targetRevenue') {
        // User enters monthly target, API needs daily
        mapped[snake] = Number(raw[camel]) / 30;
      } else if (camel === 'cogsPercent') {
        // Convert COGS% to cost_per_order if we have avg check
        const avgCheck = mapped['avg_check'] as number;
        const pct = Number(raw[camel]) / 100;
        mapped['cost_per_order'] = Math.round(avgCheck * pct);
      } else if (camel === 'growthRate') {
        // growthRate not used in v6 engine, skip
      } else {
        mapped[snake] = Number(raw[camel]);
      }
    }
  }

  return mapped;
}

type Tab = 'pnl' | 'cf' | 'bs' | 'ratios';

const tabs: { key: Tab; label: string }[] = [
  { key: 'pnl', label: 'P&L (Прибыль)' },
  { key: 'cf', label: 'Cash Flow (ДДС)' },
  { key: 'bs', label: 'Balance Sheet' },
  { key: 'ratios', label: 'Коэффициенты' },
];

function fmt(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return n.toLocaleString('ru-RU');
  return n.toFixed(2);
}

const MONTH_LABELS = [
  'Мес 1','Мес 2','Мес 3','Мес 4','Мес 5','Мес 6',
  'Мес 7','Мес 8','Мес 9','Мес 10','Мес 11','Мес 12',
  'Мес 13','Мес 14','Мес 15','Мес 16','Мес 17','Мес 18',
  'Мес 19','Мес 20','Мес 21','Мес 22','Мес 23','Мес 24',
  'Мес 25','Мес 26','Мес 27','Мес 28','Мес 29','Мес 30',
  'Мес 31','Мес 32','Мес 33','Мес 34','Мес 35','Мес 36',
];

export default function ResultsPage() {
  const params = useParams();
  const [tab, setTab] = useState<Tab>('pnl');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, any> | null>(null);

  async function calculate() {
    try {
      setLoading(true);
      setError(null);
      const project = await getProject(params.id as string);
      const rawAssumptions = project.assumptions || {};
      const mappedAssumptions = mapAssumptions(rawAssumptions as Record<string, unknown>);

      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions: mappedAssumptions }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка ${res.status}: ${await res.text()}`);
      }

      const raw = await res.json();
      const data = raw.data || raw;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка расчёта');
    } finally {
      setLoading(false);
    }
  }

  function renderFlatTable(obj: Record<string, number[]> | undefined) {
    if (!obj) return <p className="text-gray-500 p-6 text-center">Нет данных</p>;

    const entries = Object.entries(obj).filter(([, vals]) => vals.length > 0);
    if (entries.length === 0) return <p className="text-gray-500 p-6 text-center">Нет данных</p>;

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-700 whitespace-nowrap">Показатель</th>
              {MONTH_LABELS.map((l, i) =>
                <th key={i} className="text-right px-2 py-2 font-medium text-gray-500 text-xs whitespace-nowrap">{l}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, values], ri) => {
              const pnlNames = ['revenue', 'acquiring', 'net_revenue', 'cost_of_goods', 'payroll',
                'logistics', 'marketing', 'rent', 'other', 'total_expenses',
                'profit_before_tax', 'tax', 'net_profit', 'cumulative_profit'];
              const cfNames = ['operating_inflow', 'operating_outflow', 'net_operating',
                'investing', 'financing', 'cash_start', 'cash_end', 'net_cashflow'];
              const bsNames = ['cash', 'inventory', 'fixed_assets', 'total_assets',
                'capital', 'accounts_payable', 'total_liabilities'];

              const isSection = pnlNames.includes(name) || cfNames.includes(name) || bsNames.includes(name);

              return (
                <tr key={ri} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className={`px-3 py-1.5 text-xs font-medium ${isSection ? 'text-gray-900' : 'text-gray-900'} whitespace-nowrap`}>
                    {name}
                  </td>
                  {values.map((v, ci) => (
                    <td key={ci} className={`px-2 py-1.5 text-right text-xs tabular-nums ${v < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const displayData: Record<Tab, Record<string, number[]> | undefined> = {
    pnl: result?.pnl as Record<string, number[]> || undefined,
    cf: result?.cashflow as Record<string, number[]> || undefined,
    bs: result?.balance_sheet as Record<string, number[]> || undefined,
    ratios: undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/project/${params.id}/assumptions`} className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
            <h1 className="text-lg font-semibold text-gray-900">Результаты расчёта</h1>
          </div>
          <button
            onClick={calculate}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Считаю...' : '⟳ Пересчитать'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!result && !loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">Нажми «Пересчитать» чтобы получить расчёт</p>
            <button onClick={calculate} className="px-6 py-3 bg-blue-600 text-white rounded-lg">
              ⟳ Пересчитать
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-6">
            <p className="text-red-600 mb-3">{error}</p>
            <button onClick={calculate} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
              Повторить
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500">Расчёт...</p>
          </div>
        )}

        {result && !loading && (
          <>
            <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 mb-6 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition ${
                    tab === t.key
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'ratios' ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Ключевые коэффициенты</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {result.ratios && Object.entries(result.ratios).map(([k, v]) => (
                    <div key={k} className="border border-gray-100 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 mb-1">{k}</div>
                      <div className="text-lg font-bold text-gray-900">{typeof v === 'number' ? (v * 100).toFixed(1) + '%' : String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              renderFlatTable(displayData[tab])
            )}

            {result.break_even && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Точка безубыточности</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Постоянные расходы:</span>
                    <span className="font-bold ml-1">{(result.break_even.monthly_fixed || 0).toLocaleString()} ₽</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Заказов в месяц:</span>
                    <span className="font-bold ml-1">{Math.ceil(result.break_even.break_even_orders || 0)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Выручка:</span>
                    <span className="font-bold ml-1">{Math.ceil(result.break_even.break_even_revenue || 0).toLocaleString()} ₽</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
