'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Tab = 'pnl' | 'cf' | 'bs' | 'ratios';

const tabs: { key: Tab; label: string }[] = [
  { key: 'pnl', label: 'P&L (Прибыль)' },
  { key: 'cf', label: 'Cash Flow (ДДС)' },
  { key: 'bs', label: 'Balance Sheet' },
  { key: 'ratios', label: 'Коэффициенты' },
];

const MOCK_DATA = {
  pnl: {
    headers: ['Показатель', '1-й год', '2-й год', '3-й год', 'Всего'],
    rows: [
      ['Выручка', '2,430,000', '3,240,000', '3,600,000', '9,270,000'],
      ['Себестоимость', '1,701,000', '2,268,000', '2,520,000', '6,489,000'],
      ['Валовая прибыль', '729,000', '972,000', '1,080,000', '2,781,000'],
      ['ФОТ', '108,000', '108,000', '108,000', '324,000'],
      ['Эквайринг', '36,450', '48,600', '54,000', '139,050'],
      ['Прибыль до налогов', '584,550', '815,400', '918,000', '2,317,950'],
      ['Налог (УСН 15%)', '87,683', '122,310', '137,700', '347,693'],
      ['Чистая прибыль', '496,868', '693,090', '780,300', '1,970,258'],
    ],
  },
  cf: {
    headers: ['Показатель', '1-й год', '2-й год', '3-й год', 'Всего'],
    rows: [
      ['ОПЕРАЦИОННАЯ ДЕЯТЕЛЬНОСТЬ', '', '', '', ''],
      ['Поступления от продаж', '2,430,000', '3,240,000', '3,600,000', '9,270,000'],
      ['Платежи поставщикам', '−1,701,000', '−2,268,000', '−2,520,000', '−6,489,000'],
      ['ФОТ', '−108,000', '−108,000', '−108,000', '−324,000'],
      ['Эквайринг', '−36,450', '−48,600', '−54,000', '−139,050'],
      ['Налоги', '−87,683', '−122,310', '−137,700', '−347,693'],
      ['Чистый опер. поток', '496,868', '693,090', '780,300', '1,970,258'],
      ['ИНВЕСТИЦИОННАЯ ДЕЯТЕЛЬНОСТЬ', '', '', '', ''],
      ['Инвестиции', '−55,000', '0', '0', '−55,000'],
      ['Чистый инвест. поток', '−55,000', '0', '0', '−55,000'],
      ['ФИНАНСОВАЯ ДЕЯТЕЛЬНОСТЬ', '', '', '', ''],
      ['Вложения учредителя', '55,000', '0', '0', '55,000'],
      ['Чистый фин. поток', '55,000', '0', '0', '55,000'],
      ['ДС на начало', '0', '496,868', '1,189,958', '—'],
      ['ДС на конец', '496,868', '1,189,958', '1,970,258', '—'],
    ],
  },
  bs: {
    headers: ['Показатель', '1-й год', '2-й год', '3-й год'],
    rows: [
      ['АКТИВЫ', '', '', ''],
      ['Денежные средства', '496,868', '1,189,958', '1,970,258'],
      ['Итого активы', '496,868', '1,189,958', '1,970,258'],
      ['ПАССИВЫ', '', '', ''],
      ['Капитал (вложения)', '55,000', '55,000', '55,000'],
      ['Нерасп. прибыль', '441,868', '1,134,958', '1,915,258'],
      ['Итого пассивы', '496,868', '1,189,958', '1,970,258'],
    ],
  },
  ratios: {
    headers: ['Показатель', 'Значение', 'Норма', 'Оценка'],
    rows: [
      ['Рентабельность продаж (ROS)', '25.0%', '≥ 15%', '✅'],
      ['Рентабельность капитала (ROE)', '99.0%', '≥ 20%', '✅'],
      ['Коэфф. текущей ликвидности', '∞', '≥ 1.5', '✅'],
      ['Доля собств. капитала', '100%', '≥ 50%', '✅'],
    ],
  },
};

export default function ResultsPage() {
  const params = useParams();
  const [tab, setTab] = useState<Tab>('pnl');
  const data = MOCK_DATA[tab];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition">←</Link>
            <h1 className="text-lg font-semibold text-gray-900">Результаты</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/project/${params.id}/assumptions`}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Редактировать данные
            </Link>
            <button onClick={() => alert('Excel export будет')} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              📥 Excel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {data.headers.map((h, i) => (
                  <th
                    key={i}
                    className={`text-left px-4 py-3 font-medium text-gray-700 ${i === 0 ? '' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={`border-b border-gray-100 last:border-0 ${
                    row[0].toUpperCase() === row[0] && row[0] !== '' && row[1] === ''
                      ? 'bg-gray-50 font-semibold'
                      : ''
                  }`}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-2.5 ${ci === 0 ? 'text-gray-900' : 'text-right text-gray-700 tabular-nums'} ${
                        ci === 0 && row[0].toUpperCase() === row[0] && row[0] !== '' && row[1] === '' ? 'text-blue-800 text-xs uppercase tracking-wider' : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Баланс */}
        {tab === 'bs' && (
          <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-sm text-green-800 font-medium">✅ Баланс сходится: Активы = Пассивы для всех периодов</p>
          </div>
        )}
      </main>
    </div>
  );
}
