'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, getProjects, createProject, type Project } from '@/lib/supabase-client';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const project = await createProject('Новый проект');
      setProjects(prev => [project, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания');
    }
  }

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
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            + Новый проект
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Проекты</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500">Загрузка...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500 mb-4">У вас пока нет проектов</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
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
                <p className="text-xs text-gray-400 mt-3">
                  Обновлён: {new Date(p.updated_at).toLocaleDateString('ru-RU')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
