'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/supabase-client';

// Маппинг ключей формы (camelCase) → API (snake_case)
// Движок использует snake_case, форма сохраняет camelCase
// Универсальный конвертер camelCase → snake_case для любого ключа
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase());
}

function mapAssumptions(raw: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [cam, val] of Object.entries(raw)) {
    // Пропускаем ключи которые уже snake_case (нет заглавных букв после первой)
    if (/^[a-z]+(_[a-z]+)*$/.test(cam)) {
      mapped[cam] = val;
    } else {
      mapped[camelToSnake(cam)] = val;
    }
  }
  return mapped;
}

const SYMBOL_TO_CODE: Record<string, string> = {
  '₽': 'RUB', '$': 'USD', '€': 'EUR', '¥': 'CNY',
};
const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽', USD: '$', EUR: '€', CNY: '¥',
};
function resolveCurrency(v: string | undefined | null): string {
  if (!v) return 'RUB';
  if (v in CURRENCY_SYMBOLS) return v;
  if (v in SYMBOL_TO_CODE) return SYMBOL_TO_CODE[v];
  return 'RUB';
}
let _currency = 'RUB';

export default function ResultsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [months, setMonths] = useState(36);

  async function loadResults() {
    setLoading(true);
    setError('');
    
    try {
      // Сначала проверяем sessionStorage — результат от handleCalculate на главной
      const stored = sessionStorage.getItem(`calc_result_${projectId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const payload = parsed.data || parsed;
        sessionStorage.removeItem(`calc_result_${projectId}`);
        sessionStorage.removeItem(`calc_payload_${projectId}`);
        if (payload && payload.pnl) {
          setMonths(payload.pnl.revenue?.length || 36);
        }
        setData(payload);
        setLoading(false);
        return;
      }
      
      // Fallback: если sessionStorage пуст (прямой переход или старый проект)
      // Пробуем пересчитать из Supabase
      const project = await getProject(projectId);
      if (!project) {
        throw new Error('Проект не найден');
      }
      const assumptions = project.assumptions || {};
      const apiPayload = mapAssumptions(assumptions);
      const m = project.months || 36;
      setMonths(m);
      _currency = resolveCurrency(project.currency);
      setCurrency(_currency);
      apiPayload.months = m;
      apiPayload.currency = _currency;

      const resp = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions: apiPayload }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`API error ${resp.status}: ${txt.slice(0, 200)}`);
      }
      const result = await resp.json();
      const payload = result.data || result;
      setData(payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки результатов');
    } finally {
      setLoading(false);
    }
  }

  // Автоматический расчёт при загрузке страницы
  useEffect(() => {
    loadResults();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
            <h1 className="text-lg font-semibold text-gray-900">Результаты расчёта</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/?projectId=${projectId}`}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Изменить данные
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {!data && !loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500">Нажмите &laquo;Рассчитать&raquo;, чтобы получить результат.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-500">Расчёт 36 месяцев...</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <ResultsDashboard data={data} />
            <ResultsPnl data={data} months={months} />
            <ResultsCashFlow data={data} months={months} />
            <ResultsBalanceSheet data={data} months={months} />
            <ResultsRatios data={data} />
          </div>
        )}
      </main>
    </div>
  );
}

// ===== Componentes =====

function ResultsDashboard({ data }: { data: Record<string, unknown> }) {
  const pnl = (data.pnl as Record<string, number[]>) || {};
  const cf = (data.cashflow as Record<string, number[]>) || {};
  const bs = (data.balance_sheet as Record<string, number[]>) || {};
  const ratios = (data.ratios as Record<string, number>) || {};
  const calc = (data.calculated as Record<string, number>) || {};
  const orders = (data.orders as number[]) || [];

  const revY1 = sum(pnl.revenue?.slice(0, 12));
  const npY1 = sum(pnl.net_profit?.slice(0, 12));
  const revY2 = sum(pnl.revenue?.slice(12, 24));
  const revY3 = sum(pnl.revenue?.slice(24, 36));
  const endCash = cf.cash_end?.[35] || 0;

  const baseInv = calc.base_investments || 0;
  const autoInv = calc.auto_investments || 0;
  const totalInv = calc.total_investments || 0;

  // Скидки — предупреждение
  const discountsTotal = pnl.discounts_total as number[] | undefined;
  const ebitdaMargin = pnl.ebitda_margin as number[] | undefined;
  const hasDiscountWarnings = discountsTotal && discountsTotal[0] > 0 && ebitdaMargin && ebitdaMargin !== undefined;

  const discountPct = discountsTotal && pnl.revenue ? (discountsTotal[0] / pnl.revenue[0] * 100) : 0;
  const ebitdaMargY1 = ebitdaMargin ? ebitdaMargin[0] : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">📈 Дашборд</h2>

      {hasDiscountWarnings && discountPct > 0 && (
        <div className={`mb-4 p-3 rounded-lg border ${
          discountPct >= ebitdaMargY1
            ? 'bg-red-50 border-red-200'
            : discountPct >= ebitdaMargY1 * 0.7
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="text-xs font-semibold mb-1" style={{color: discountPct >= ebitdaMargY1 ? '#dc2626' : discountPct >= ebitdaMargY1 * 0.7 ? '#d97706' : '#2563eb'}}>
            {discountPct >= ebitdaMargY1 ? '⚠️ Скидки превышают EBITDA маржинальность!' : '💡 Скидки влияют на прибыль'}
          </div>
          <div className="text-xs mt-1" style={{color: discountPct >= ebitdaMargY1 ? '#991b1b' : '#92400e'}}>
            Скидки составляют <strong>{discountPct.toFixed(1)}%</strong> от выручки, 
            EBITDA маржинальность — <strong>{ebitdaMargY1.toFixed(1)}%</strong>.
            {discountPct >= ebitdaMargY1
              ? ' Скидки полностью съедают операционную прибыль. Пересмотрите скидочную политику.'
              : discountPct >= ebitdaMargY1 * 0.7
                ? ' Скидки приближаются к маржинальности. Рекомендуется анализ.'
                : ' Контролируйте уровень скидок.'
            }
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Выручка Год 1" value={revY1} fmt="money" />
        <MetricBox label="Выручка Год 2" value={revY2} fmt="money" />
        <MetricBox label="Выручка Год 3" value={revY3} fmt="money" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
        <MetricBox label="ЧП Год 1" value={npY1} fmt="money" />
        <MetricBox label="ДС на конец 3-го" value={endCash} fmt="money" />
      </div>
      {(autoInv > 0) && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-xs text-yellow-700 mb-1">💡 Дополнительные инвестиции на покрытие ДЗ</div>
          <div className="text-sm">
            <span className="text-gray-600">Стартовые: </span>
            <span className="font-semibold mr-3">{fmtNum(baseInv)} {CURRENCY_SYMBOLS[_currency]}</span>
            <span className="text-gray-600">+ На покрытие ДЗ: </span>
            <span className="font-semibold text-yellow-700">{fmtNum(autoInv)} {CURRENCY_SYMBOLS[_currency]}</span>
            <span className="text-gray-500 ml-1">= </span>
            <span className="font-bold">{fmtNum(totalInv)} {CURRENCY_SYMBOLS[_currency]}</span>
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            Деньги по выбранным продуктам приходят с отсрочкой. Добавлена инвестиция на покрытие себестоимости и налогов первого месяца.
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsPnl({ data, months }: { data: Record<string, unknown>; months: number }) {
  const pnl = (data.pnl as Record<string, number[]>) || {};

  type RowDef = { label: string; key: string; fmt?: string };
  const rows: RowDef[] = [
    { label: 'Выручка от продаж', key: 'revenue', fmt: 'money' },
    { label: 'Скидки и промо', key: 'discounts_total', fmt: 'money' },
    { label: 'Чистая выручка', key: 'net_revenue', fmt: 'money' },
    { label: 'Себестоимость закупки', key: 'purchase_cogs', fmt: 'money' },
    { label: 'Переменные расходы', key: 'variable_extra', fmt: 'money' },
    { label: 'Итого переменные', key: 'total_variable', fmt: 'money' },
    { label: 'Валовая прибыль', key: 'gross_profit', fmt: 'money' },
    { label: 'Маржинальность', key: 'gross_margin', fmt: 'pct' },
    { label: 'Расходы (без ФОТ)', key: 'fixed_costs', fmt: 'money' },
    { label: 'ФОТ + налоги', key: 'payroll_total', fmt: 'money' },
    { label: 'Итого постоянные', key: 'total_fixed', fmt: 'money' },
    { label: 'EBITDA', key: 'ebitda', fmt: 'money' },
    { label: 'Налоги', key: 'tax', fmt: 'money' },
    { label: 'Чистая прибыль', key: 'net_profit', fmt: 'money' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 БДР (P&L)</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Статья</th>
            {Array.from({ length: months }, (_, i) => (
              <th key={i} className="text-right py-1.5 px-1 font-medium text-gray-400">{i+1}</th>
            ))}
            {[12, 24, 36, 48, 60].filter(y => y <= months).map(y => (
              <th key={'y'+y} className="text-right py-1.5 pl-2 font-medium text-blue-600">Год {y/12}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const vals = (pnl[row.key] || []) as number[];
            return (
              <tr key={ri} className="border-b border-gray-50">
                <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">{row.label}</td>
                {Array.from({ length: months }, (_, i) => (
                  <td key={i} className={"text-right py-1.5 px-1 whitespace-nowrap font-mono" + negClass(vals[i] || 0)}>
                    {row.fmt === 'pct' ? fmtPct(vals[i] || 0) : fmtNum(vals[i] || 0)}
                  </td>
                ))}
                {[12, 24, 36, 48, 60].filter(y => y <= months).map(y => {
                  const yVals = vals.slice(y - 12, y);
                  const ySum = sum(yVals);
                  return (
                    <td key={'y'+y} className={"text-right py-1.5 pl-2 whitespace-nowrap font-mono font-medium" + (ySum < 0 ? ' text-red-600' : ' text-blue-700')}>
                      {row.fmt === 'pct' ? fmtPct(ySum / 12) : fmtNum(ySum)}
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

function YearColumns({ months, vals, fmt }: { months: number; vals: number[]; fmt?: string }) {
  const yearMonths = [12, 24, 36, 48, 60];
  return (
    <>
      {Array.from({ length: months }, (_, i) => (
        <td key={i} className={"text-right py-1.5 px-1 whitespace-nowrap font-mono" + negClass(vals[i] || 0)}>
          {fmt === 'pct' ? fmtPct(vals[i] || 0) : fmtNum(vals[i] || 0)}
        </td>
      ))}
      {yearMonths.filter(y => y <= months).map(y => {
        const yVals = vals.slice(y - 12, y);
        const ySum = sum(yVals);
        return (
          <td key={'y'+y} className={"text-right py-1.5 pl-2 whitespace-nowrap font-mono font-medium" + (ySum < 0 ? ' text-red-600' : ' text-blue-700')}>
            {fmt === 'pct' ? fmtPct(ySum / 12) : fmtNum(ySum)}
          </td>
        );
      })}
    </>
  );
}

function ResultsCashFlow({ data, months }: { data: Record<string, unknown>; months: number }) {
  const cf = (data.cashflow as Record<string, number[]>) || {};

  const rows = [
    { label: 'Поступления', key: 'operating_inflow' },
    { label: 'Платежи поставщикам', key: 'supplier_payments' },
    { label: 'Переменные расходы', key: 'var_payments' },
    { label: 'Операционные расходы', key: 'op_expenses' },
    { label: 'Налоги', key: 'tax_payments' },
    { label: 'CF операционный', key: 'net_operating', bold: true },
    { label: 'CF инвестиционный', key: 'investing' },
    { label: 'CF финансовый', key: 'financing' },
    { label: 'Чистый CF', key: 'net_cashflow', bold: true },
    { label: 'ДС на конец', key: 'cash_end', bold: true },
  ];

  const yearMonths = [12, 24, 36, 48, 60].filter(y => y <= months);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">💰 БДДС (Cash Flow)</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Статья</th>
            {Array.from({ length: months }, (_, i) => (
              <th key={i} className="text-right py-1.5 px-1 font-medium text-gray-400">{i+1}</th>
            ))}
            {yearMonths.map(y => (
              <th key={'y'+y} className="text-right py-1.5 pl-2 font-medium text-blue-600">Год {y/12}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const vals = (cf[row.key] || []) as number[];
            return (
              <tr key={ri} className="border-b border-gray-50">
                <td className={`py-1.5 pr-3 whitespace-nowrap ${row.bold ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                  {row.label}
                </td>
                <YearColumns months={months} vals={vals} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultsBalanceSheet({ data, months }: { data: Record<string, unknown>; months: number }) {
  const bs = (data.balance_sheet as Record<string, number[]>) || {};

  const rows = [
    { label: 'Денежные средства', key: 'cash' },
    { label: 'Запасы', key: 'inventory' },
    { label: 'Дебиторская задолженность', key: 'accounts_receivable' },
    { label: 'ИТОГО АКТИВЫ', key: 'total_assets', bold: true },
    { label: 'Кредиторская задолженность', key: 'accounts_payable' },
    { label: 'Собственный капитал', key: 'capital' },
    { label: 'ИТОГО ПАССИВЫ', key: 'total_liabilities', bold: true },
    { label: 'Проверка (0)', key: 'balance_check', bold: true },
  ];

  const yearMonths = [12, 24, 36, 48, 60].filter(y => y <= months);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">🏛️ Баланс (Balance Sheet)</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Статья</th>
            {Array.from({ length: months }, (_, i) => (
              <th key={i} className="text-right py-1.5 px-1 font-medium text-gray-400">{i+1}</th>
            ))}
            {yearMonths.map(y => (
              <th key={'y'+y} className="text-right py-1.5 pl-2 font-medium text-blue-600">Год {y/12}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const vals = (bs[row.key] || []) as number[];
            const isCheck = row.key === 'balance_check';
            return (
              <tr key={ri} className={`border-b border-gray-50 ${isCheck ? 'bg-gray-50' : ''}`}>
                <td className={`py-1.5 pr-3 whitespace-nowrap ${row.bold ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                  {row.label}
                </td>
                <YearColumns months={months} vals={vals} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultsRatios({ data }: { data: Record<string, unknown> }) {
  const r = (data.ratios as Record<string, number>) || {};
  const be = (data.break_even as Record<string, number>) || {};

  const items = [
    { label: 'ROE', value: r.ROE, fmt: 'pct' },
    { label: 'ROCE', value: r.ROCE, fmt: 'pct' },
    { label: 'OPM', value: r.OPM, fmt: 'pct' },
    { label: 'GPM', value: r.GPM, fmt: 'pct' },
    { label: 'ЧП / Уплаченный налог', value: r.NPtoTax, fmt: 'ratio' },
    { label: 'NPV', value: r.NPV, fmt: 'money' },
    { label: 'IRR', value: r.IRR, fmt: 'pct' },
    { label: 'Окупаемость (мес)', value: r.PaybackMonths, fmt: 'months' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 Коэффициенты</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
            <div className={"text-lg font-semibold" + ((item.value || 0) < 0 ? ' text-red-600' : ' text-gray-800')}>
              {item.fmt === 'pct' ? `${(item.value || 0).toFixed(1)}%` :
               item.fmt === 'months' ? `${item.value && item.value < 900 ? item.value.toFixed(1) + ' мес' : '—'}` :
               item.fmt === 'money' ? `${CURRENCY_SYMBOLS[_currency]} ${(item.value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}` :
               (item.value || 0).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
      {be.margin_per_bag && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-blue-600 mb-1">Точка безубыточности</div>
          <div className="text-sm text-blue-800">
            Маржа с мешка: <strong>{fmtNum(be.margin_per_bag)} {CURRENCY_SYMBOLS[_currency]}</strong> · 
            Безубыт. заказов: <strong>{be.break_even_orders || 0} шт/мес</strong> · 
            Фикс. расходы: <strong>{fmtNum(be.monthly_fixed)} {CURRENCY_SYMBOLS[_currency]}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Helpers =====
function sum(arr: number[] | undefined): number {
  if (!arr) return 0;
  return arr.reduce((s, v) => s + (v || 0), 0);
}

function fmtNum(n: number | undefined | null | string): string {
  if (n === undefined || n === null || n === '' || n === 'undefined') return '—';
  const val = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(val)) return '—';
  if (val === 0) return '-';
  return val.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function negClass(n: number): string {
  return n < 0 ? ' text-red-600' : '';
}

function fmtPct(n: number): string {
  if (n === 0) return '-';
  return `${(n * 100).toFixed(1)}%`;
}

function MetricBox({ label, value, fmt }: { label: string; value?: number; fmt?: string }) {
  const v = value || 0;
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={"text-lg font-semibold text-gray-800" + negClass(v)}>
        {fmt === 'money' ? `${CURRENCY_SYMBOLS[_currency]} ${v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}` :
         fmt === 'pct' ? `${v.toFixed(1)}%` :
         fmt === 'months' ? `${value && value < 900 ? value.toFixed(1) + ' мес' : '—'}` :
         v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}
