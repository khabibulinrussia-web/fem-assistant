'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconBusiness, IconDashboard, IconIncome, IconExpense, IconIntegrations } from '@/components/icons';

type Theme = 'dark' | 'light';

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [files, setFiles] = useState<Array<{name: string, status: 'uploading' | 'done' | 'error', result?: any}>>([]);
  const [stage, setStage] = useState<'upload' | 'dashboard' | 'plan-input' | 'diagnostics'>('upload');

  useEffect(() => {
    const saved = localStorage.getItem('erp_theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  const th = theme === 'dark' ? {
    bg: '#0b1120', card: '#111827', cardBorder: '#1e293b',
    text: '#f1f5f9', textMuted: '#64748b', textDim: '#475569',
    headerBg: '#0a0f1d', inputBg: '#0a0f1d', inputBorder: '#334155',
    accent: '#2563eb',
  } : {
    bg: '#f8fafc', card: '#ffffff', cardBorder: '#e2e8f0',
    text: '#0f172a', textMuted: '#475569', textDim: '#94a3b8',
    headerBg: '#ffffff', inputBg: '#ffffff', inputBorder: '#cbd5e1',
    accent: '#2563eb',
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const entry = { name: file.name, status: 'uploading' as const };
    setFiles(prev => [...prev, entry]);

    const form = new FormData();
    form.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/upload`, { method: 'POST', body: form });
      const data = await res.json();
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done', result: data.result } : f));
    } catch {
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f));
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const hasTaxData = files.some(f => f.result?.type === 'usn_declaration');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: th.bg, color: th.text, transition: 'all 0.15s' }}>
      <header style={{ borderBottom: `1px solid ${th.cardBorder}`, backgroundColor: th.headerBg }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" style={{ color: th.textMuted, fontSize: 18, textDecoration: 'none' }}>←</Link>
            <IconBusiness size={18} color={th.textMuted} />
            <h1 style={{ color: th.text, fontSize: 15, fontWeight: 600 }}>Мой бизнес</h1>
          </div>
          <span style={{ color: th.textDim, fontSize: 10 }}>
            {stage === 'upload' ? 'Шаг 1 из 4' :
             stage === 'dashboard' ? 'Шаг 2 из 4' :
             stage === 'plan-input' ? 'Шаг 3 из 4' :
             'Шаг 4 из 4'}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 20px' }}>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {['📥', '📊', '📝', '🔍'].map((icon, i) => {
            const steps = ['upload', 'dashboard', 'plan-input', 'diagnostics'] as const;
            const labels = ['Загрузка', 'Показатели', 'План', 'Диагностика'];
            const isActive = stage === steps[i];
            const isPast = steps.indexOf(stage) > i;
            return (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 8,
                backgroundColor: isActive ? '#1e3a5f' : isPast ? '#064e3b' : th.card,
                border: '1px solid', borderColor: isActive ? '#2563eb' : isPast ? '#065f46' : th.cardBorder
              }}>
                <div style={{ fontSize: 13 }}>{icon}</div>
                <div style={{ fontSize: 8, color: isActive ? '#93c5fd' : isPast ? '#6ee7b7' : th.textDim, marginTop: 1 }}>{labels[i]}</div>
              </div>
            );
          })}
        </div>

        {/* STAGE 1: UPLOAD */}
        {stage === 'upload' && (
          <div>
            <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h2 style={{ color: th.text, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Загрузите данные вашего бизнеса</h2>
              <p style={{ color: th.textMuted, fontSize: 10, marginBottom: 16 }}>Декларации УСН, выписки банка, Excel из 1С — система распознает автоматически</p>
              
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', backgroundColor: '#1e3a5f', color: '#93c5fd', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 500, border: '1px dashed #2563eb' }}>
                <IconIncome size={16} color="#93c5fd" /> + Добавить файл
                <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{f.name.endsWith('.pdf') ? '📄' : '📊'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: th.text, fontSize: 12 }}>{f.name}</div>
                      {f.status === 'uploading' && <div style={{ color: '#fbbf24', fontSize: 10 }}>⏳ Распознаётся...</div>}
                      {f.status === 'done' && f.result && (
                        <div style={{ fontSize: 10, color: th.textMuted, marginTop: 2 }}>
                          {f.result.type === 'usn_declaration' && (
                            <span>✅ Декларация УСН {f.result.year} — доходы {f.result.income?.toLocaleString()} ₽</span>
                          )}
                          {f.result.type === 'bank_statement' && (
                            <span>✅ Выписка — {f.result.transactions?.length || '?'} операций</span>
                          )}
                          {f.result.type === 'unknown' && <span>⚠️ Формат не распознан</span>}
                        </div>
                      )}
                      {f.status === 'error' && <div style={{ color: '#f87171', fontSize: 10 }}>❌ Ошибка распознавания</div>}
                    </div>
                    {f.status === 'done' && <span style={{ color: '#4ade80', fontSize: 16 }}>✅</span>}
                    {f.status === 'uploading' && <div style={{ width: 16, height: 16, border: '2px solid #fbbf24', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <button onClick={() => setStage('dashboard')} style={{ width: '100%', padding: 10, backgroundColor: th.accent, color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <IconDashboard size={16} color="white" /> Показать результаты бизнеса
              </button>
            )}
          </div>
        )}

        {/* STAGE 2: DASHBOARD */}
        {stage === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <IconIncome size={14} color="#60a5fa" />
                  <span style={{ color: th.textDim, fontSize: 10 }}>Выручка (год)</span>
                </div>
                <div style={{ color: th.text, fontSize: 18, fontWeight: 700 }}>3 245 600 ₽</div>
              </div>
              <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 12, padding: 14 }}>
                <div style={{ color: th.textDim, fontSize: 10, marginBottom: 4 }}>EBITDA</div>
                <div style={{ color: '#4ade80', fontSize: 18, fontWeight: 700 }}>540 000 ₽</div>
                <div style={{ color: '#6ee7b7', fontSize: 10 }}>16.6% margin</div>
              </div>
              <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 12, padding: 14 }}>
                <div style={{ color: th.textDim, fontSize: 10, marginBottom: 4 }}>Чистая прибыль</div>
                <div style={{ color: '#fbbf24', fontSize: 18, fontWeight: 700 }}>346 000 ₽</div>
              </div>
            </div>

            <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <h3 style={{ color: th.text, fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconDashboard size={15} color="#60a5fa" /> Структура затрат
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '5px 10px', borderRadius: 8, fontSize: 10 }}>
                  Себестоимость: 1 200 000 ₽ (37%)
                </div>
                <div style={{ backgroundColor: '#450a0a', color: '#fca5a5', padding: '5px 10px', borderRadius: 8, fontSize: 10 }}>
                  <IconExpense size={10} color="#fca5a5" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> Постоянные: 1 100 000 ₽ (34%)
                </div>
                <div style={{ backgroundColor: '#422006', color: '#fbbf24', padding: '5px 10px', borderRadius: 8, fontSize: 10 }}>
                  Переменные: 400 000 ₽ (12%)
                </div>
                <div style={{ backgroundColor: '#1e3a5f', color: '#93c5fd', padding: '5px 10px', borderRadius: 8, fontSize: 10 }}>
                  Налоги: 200 000 ₽ (6%)
                </div>
              </div>
              <div style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#f87171' }}>⚠️</span>
                <span style={{ color: '#fca5a5', fontSize: 10 }}>Постоянные расходы составляют 34% от выручки — <strong>выше нормы (30%)</strong>. При спаде продаж бизнес уйдёт в минус.</span>
              </div>
            </div>

            <button onClick={() => setStage('plan-input')} style={{ width: '100%', padding: 10, backgroundColor: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb', borderRadius: 10, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IconIntegrations size={16} color="#93c5fd" /> Сделать план на следующие 12 месяцев →
            </button>
          </div>
        )}

        {/* STAGE 3: PLAN INPUT */}
        {stage === 'plan-input' && (
          <div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <div style={{ flex: 1, backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 14, padding: 16 }}>
                <h3 style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconIncome size={13} color="#60a5fa" /> Факт 2025
                </h3>
                <div style={{ fontSize: 10, color: th.textMuted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>Выручка: <strong style={{ color: th.text }}>3 245 600 ₽</strong></span>
                  <span>Постоянные: <strong style={{ color: th.text }}>1 100 000 ₽</strong></span>
                  <span>Переменные: <strong style={{ color: th.text }}>400 000 ₽</strong></span>
                  <span>EBITDA: <strong style={{ color: '#4ade80' }}>540 000 ₽</strong></span>
                  <span>Инвестиции: <strong style={{ color: th.text }}>200 000 ₽</strong></span>
                </div>
              </div>
              <div style={{ flex: 1, backgroundColor: th.card, border: `1px solid ${th.accent}`, borderRadius: 14, padding: 16 }}>
                <h3 style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>План 2026</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'Выручка', key: 'revenue', val: '4 000 000' },
                    { label: 'Постоянные', key: 'fixed', val: '1 500 000' },
                    { label: 'Переменные', key: 'variable', val: '500 000' },
                    { label: 'Инвестиции', key: 'invest', val: '600 000' },
                  ].map(f => (
                    <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: th.textMuted, fontSize: 10 }}>{f.label}</span>
                      <input
                        type="text"
                        defaultValue={f.val}
                        style={{ width: 100, padding: '2px 6px', backgroundColor: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: 4, color: th.text, fontSize: 10, textAlign: 'right' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setStage('diagnostics')} style={{ width: '100%', padding: 10, backgroundColor: '#7c3aed', color: '#d8b4fe', border: '1px solid #7c3aed', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>
              🔍 Диагностировать план
            </button>
          </div>
        )}

        {/* STAGE 4: DIAGNOSTICS */}
        {stage === 'diagnostics' && (
          <div>
            <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <h3 style={{ color: th.text, fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconDashboard size={14} color="#60a5fa" /> План vs Факт
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 3, fontSize: 10 }}>
                <div style={{ color: th.textDim }}>Показатель</div>
                <div style={{ color: th.textDim, textAlign: 'right' }}>Факт 2025</div>
                <div style={{ color: th.textDim, textAlign: 'right' }}>План 2026</div>
                <div style={{ color: th.textDim, textAlign: 'right' }}>Δ</div>

                <div style={{ color: th.textMuted }}>Выручка</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>3.2 млн</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>4.0 млн</div>
                <div style={{ color: '#4ade80', textAlign: 'right' }}>+25%</div>

                <div style={{ color: th.textMuted }}>Постоянные</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>1.1 млн</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>1.5 млн</div>
                <div style={{ color: '#f87171', textAlign: 'right' }}>+36% 🔴</div>

                <div style={{ color: th.textMuted }}>Переменные</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>0.4 млн</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>0.5 млн</div>
                <div style={{ color: '#fbbf24', textAlign: 'right' }}>+25%</div>

                <div style={{ color: th.textMuted }}>Инвестиции</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>0.2 млн</div>
                <div style={{ color: th.textMuted, textAlign: 'right' }}>0.6 млн</div>
                <div style={{ color: '#f87171', textAlign: 'right' }}>+200% 🔴</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h4 style={{ color: '#60a5fa', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>📐 Коэффициенты</h4>
                <div style={{ fontSize: 9, color: th.textMuted, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>Пост / Выручка: <strong style={{ color: '#f87171' }}>34% → 37.5% 🔴</strong></span>
                  <span>Перем / Выручка: <strong style={{ color: '#4ade80' }}>12.5% → 12.5% ✅</strong></span>
                  <span>Маржинальность: <strong style={{ color: th.textMuted }}>50.5% → 50.0%</strong></span>
                  <span>EBITDA margin: <strong style={{ color: '#f87171' }}>16.6% → 15.3% 🔴</strong></span>
                  <span>Точка безубыточности: <strong style={{ color: '#fbbf24' }}>72% → 78% ⚠️</strong></span>
                </div>
              </div>
              <div style={{ backgroundColor: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: 10, padding: 12 }}>
                <h4 style={{ color: '#f87171', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>🚩 Красные флаги</h4>
                <div style={{ fontSize: 9, color: '#fca5a5', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>⚠️ Постоянные растут быстрее выручки (+36% vs +25%)</span>
                  <span>⚠️ Новый станок (300 тыс) недозагружен — EBITDA падает</span>
                  <span>⚠️ Запас прочности: 22% → снижен до 22%</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ color: '#fbbf24', fontSize: 14 }}>💡</span>
                <div style={{ color: '#fca5a5', fontSize: 10 }}>
                  <strong style={{ color: '#f87171' }}>План неоптимален.</strong> При текущей структуре затрат EBITDA снизится на 1.3 п.п.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ backgroundColor: '#0a0f1d', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#fbbf24', fontSize: 12 }}>А</span>
                  <div style={{ flex: 1, fontSize: 9, color: th.textMuted }}>Увеличить план до <strong style={{ color: '#4ade80' }}>4.4 млн</strong> → EBITDA <strong style={{ color: '#4ade80' }}>17.2%</strong></div>
                  <button style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #2563eb', backgroundColor: '#1e3a5f', color: '#93c5fd', fontSize: 8, cursor: 'pointer' }}>Применить</button>
                </div>
                <div style={{ backgroundColor: '#0a0f1d', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#fbbf24', fontSize: 12 }}>Б</span>
                  <div style={{ flex: 1, fontSize: 9, color: th.textMuted }}>Отложить станок на 6 мес → <strong style={{ color: '#4ade80' }}>EBITDA 16.1%</strong></div>
                  <button style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #2563eb', backgroundColor: '#1e3a5f', color: '#93c5fd', fontSize: 8, cursor: 'pointer' }}>Применить</button>
                </div>
                <div style={{ backgroundColor: '#0a0f1d', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#fbbf24', fontSize: 12 }}>В</span>
                  <div style={{ flex: 1, fontSize: 9, color: th.textMuted }}>Сократить постоянные на <strong style={{ color: '#22c55e' }}>200 тыс</strong> → EBITDA <strong style={{ color: '#4ade80' }}>16.8%</strong></div>
                  <button style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #2563eb', backgroundColor: '#1e3a5f', color: '#93c5fd', fontSize: 8, cursor: 'pointer' }}>Применить</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStage('plan-input')} style={{ flex: 1, padding: 8, backgroundColor: 'transparent', color: th.textMuted, border: `1px solid ${th.cardBorder}`, borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>
                ✏️ Вернуться к плану
              </button>
              <button style={{ flex: 1, padding: 8, backgroundColor: '#064e3b', color: '#6ee7b7', border: '1px solid #065f46', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>
                ✅ Утвердить и сохранить
              </button>
            </div>
          </div>
        )}

      </main>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
