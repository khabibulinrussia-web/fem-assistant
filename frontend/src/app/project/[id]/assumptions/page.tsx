'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AssumptionGroup {
  title: string;
  fields: { key: string; label: string; type: 'number' | 'percent' | 'text'; value: number | string; hint?: string }[];
}

const EMPTY_ASSUMPTIONS: AssumptionGroup[] = [
  {
    title: '📈 Продажи',
    fields: [
      { key: 'targetRevenue', label: 'Целевая выручка (в месяц)', type: 'number', value: 3_000_000, hint: 'К чему стремимся' },
      { key: 'avgOrderValue', label: 'Средний чек', type: 'number', value: 1_500 },
      { key: 'ordersPerDay', label: 'Заказов в день (план)', type: 'number', value: 15 },
      { key: 'growthRate', label: 'Рост выручки (% в месяц)', type: 'percent', value: 5 },
    ],
  },
  {
    title: '💰 Расходы',
    fields: [
      { key: 'cogsPercent', label: 'Себестоимость (% от выручки)', type: 'percent', value: 70 },
      { key: 'payroll', label: 'ФОТ (в месяц)', type: 'number', value: 9_000 },
      { key: 'rent', label: 'Аренда (в месяц)', type: 'number', value: 0 },
      { key: 'marketing', label: 'Маркетинг (в месяц)', type: 'number', value: 0 },
      { key: 'acquiringPercent', label: 'Эквайринг (% от выручки)', type: 'percent', value: 1.5 },
    ],
  },
  {
    title: '🏛️ Налоги',
    fields: [
      { key: 'taxSystem', label: 'Система налогообложения', type: 'text', value: 'УСН 15%' },
      { key: 'taxRate', label: 'Ставка налога', type: 'percent', value: 15 },
    ],
  },
  {
    title: '🚀 Инвестиции',
    fields: [
      { key: 'investmentReg', label: 'Регистрация ИП', type: 'number', value: 5_000 },
      { key: 'investmentReserve', label: 'Резервный фонд', type: 'number', value: 50_000 },
      { key: 'investmentTotal', label: 'Всего инвестиций', type: 'number', value: 55_000, hint: 'Рассчитывается автоматически' },
    ],
  },
  {
    title: '📊 Параметры модели',
    fields: [
      { key: 'forecastMonths', label: 'Горизонт планирования (мес)', type: 'number', value: 36 },
      { key: 'rampUp1', label: 'Ramp-up месяц 1', type: 'percent', value: 85 },
      { key: 'rampUp2', label: 'Ramp-up месяц 2', type: 'percent', value: 90 },
      { key: 'rampUp3', label: 'Ramp-up месяц 3', type: 'percent', value: 100 },
    ],
  },
  {
    title: '🔄 Оборачиваемость',
    fields: [
      { key: 'receivablesTurnover', label: 'Оборачиваемость ДЗ (дни)', type: 'number', value: 0, hint: '0 = предоплата' },
      { key: 'payablesTurnover', label: 'Оборачиваемость КЗ (дни)', type: 'number', value: 0 },
      { key: 'inventoryTurnover', label: 'Оборачиваемость запасов (дни)', type: 'number', value: 0 },
    ],
  },
];

export default function AssumptionsPage() {
  const params = useParams();
  const router = useRouter();
  const [groups, setGroups] = useState<AssumptionGroup[]>(EMPTY_ASSUMPTIONS);
  const [saving, setSaving] = useState(false);

  const updateField = (groupIdx: number, fieldIdx: number, value: string) => {
    const newGroups = structuredClone(groups);
    const field = newGroups[groupIdx].fields[fieldIdx];
    if (field.type === 'number') field.value = Number(value) || 0;
    else if (field.type === 'percent') field.value = Number(value) || 0;
    else field.value = value;
    setGroups(newGroups);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition">←</Link>
            <h1 className="text-lg font-semibold text-gray-900">Входящие данные</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                await new Promise(r => setTimeout(r, 500));
                setSaving(false);
                router.push(`/project/${params.id}/results`);
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Рассчитать'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {groups.map((group, gi) => (
          <div key={gi} className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{group.title}</h2>
            <div className="space-y-3">
              {group.fields.map((field, fi) => (
                <div key={field.key}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {field.label}
                    {field.hint && <span className="text-xs text-gray-400 ml-1">— {field.hint}</span>}
                  </label>
                  {field.type === 'text' ? (
                    <input
                      type="text"
                      value={field.value as string}
                      onChange={(e) => updateField(gi, fi, e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        value={field.value}
                        onChange={(e) => updateField(gi, fi, e.target.value)}
                        className="w-full px-3 py-1.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {field.type === 'percent' ? '%' : '₽'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
