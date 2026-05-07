'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  currency: string;
  months: number;
  status: 'draft' | 'ready' | 'error';
  updatedAt: string;
}

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Сытые Носики (Grandorf)',
    currency: 'RUB',
    months: 36,
    status: 'ready',
    updatedAt: '2026-05-07',
  },
  {
    id: '2',
    name: 'Новый проект',
    currency: 'RUB',
    months: 12,
    status: 'draft',
    updatedAt: '—',
  },
];

const statusLabels: Record<Project['status'], string> = {
  draft: 'Черновик',
  ready: 'Рассчитан',
  error: 'Ошибка',
};

const statusColors: Record<Project['status'], string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  ready: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

export default function DashboardPage() {
  const [projects] = useState<Project[]>(MOCK_PROJECTS);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ФЭМ</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">ФЭМ-ассистент</h1>
          </div>
          <button
            onClick={() => {/* TODO: новый проект */}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            + Новый проект
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Проекты</h2>
        
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500 mb-4">У вас пока нет проектов</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
              Создать первый проект
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}/assumptions`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[p.status]}`}>
                    {statusLabels[p.status]}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>💳 {p.currency}</span>
                  <span>📅 {p.months} мес.</span>
                </div>
                {p.updatedAt !== '—' && (
                  <p className="text-xs text-gray-400 mt-3">Обновлён: {p.updatedAt}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
