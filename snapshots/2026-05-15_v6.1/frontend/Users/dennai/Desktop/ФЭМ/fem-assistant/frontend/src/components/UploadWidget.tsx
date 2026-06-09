'use client';
import { useState, useRef } from 'react';

interface UploadResult {
  status: string;
  result?: {
    type: string;
    inn?: string;
    year?: string;
    income?: number;
    expenses?: number;
    tax_base?: number;
    tax_rate?: number;
    tax_calculated?: number;
    insurance?: number;
    tax_payable?: number;
    confidence?: number;
    error?: string;
  };
}

interface Props {
  onDataParsed: (data: Record<string, number | string>) => void;
}

export default function UploadWidget({ onDataParsed }: Props) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      setResult(data);

      if (data.status === 'ok' && data.result && data.result.confidence && data.result.confidence >= 50) {
        const r = data.result;
        const parsed: Record<string, number | string> = {};

        if (r.inn) parsed['inn'] = r.inn;
        if (r.year) parsed['year'] = r.year;
        if (r.income) parsed['projectedRevenue'] = r.income;
        if (r.expenses) parsed['costOfGoods'] = r.expenses;
        if (r.tax_rate) parsed['taxRate'] = r.tax_rate;
        if (r.tax_calculated) parsed['projectedTax'] = r.tax_calculated;
        if (r.insurance) parsed['insurancePremiums'] = r.insurance;
        if (r.tax_payable) parsed['projectedTaxPayable'] = r.tax_payable;

        if (Object.keys(parsed).length > 0) {
          onDataParsed(parsed);
        }
      }
    } catch (err) {
      setError('Ошибка загрузки: ' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1e293b',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 20 }}>📄</div>
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>Загрузить декларацию</div>
          <div style={{ color: '#64748b', fontSize: 11 }}>PDF УСН, выписка банка или Excel</div>
        </div>
        <label style={{
          marginLeft: 'auto',
          background: '#1e3a5f',
          color: '#93c5fd',
          padding: '6px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
        }}>
          {uploading ? '⏳ Загрузка...' : 'Выбрать файл'}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: 12, background: '#450a0a', padding: '8px 12px', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {result && result.status === 'ok' && result.result && (
        <div style={{
          background: '#0a0f1d',
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              background: result.result.confidence && result.result.confidence >= 80 ? '#064e3b' : '#422006',
              color: result.result.confidence && result.result.confidence >= 80 ? '#6ee7b7' : '#fbbf24',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 10,
            }}>
              {result.result.confidence}% уверенность
            </span>
            <span style={{ color: '#64748b', fontSize: 10 }}>{result.result.type}</span>
          </div>

          <table style={{ width: '100%', fontSize: 11, color: '#94a3b8' }}>
            <tbody>
              {result.result.inn && (
                <tr><td style={{ padding: '2px 0' }}>ИНН</td><td style={{ color: '#e2e8f0' }}>{result.result.inn}</td></tr>
              )}
              {result.result.year && (
                <tr><td style={{ padding: '2px 0' }}>Период</td><td style={{ color: '#e2e8f0' }}>{result.result.year}</td></tr>
              )}
              {result.result.income !== undefined && result.result.income !== null && (
                <tr><td style={{ padding: '2px 0' }}>Доходы</td><td style={{ color: '#4ade80' }}>{result.result.income.toLocaleString()} ₽</td></tr>
              )}
              {result.result.expenses !== undefined && result.result.expenses !== null && (
                <tr><td style={{ padding: '2px 0' }}>Расходы</td><td style={{ color: '#f87171' }}>{result.result.expenses.toLocaleString()} ₽</td></tr>
              )}
              {result.result.tax_payable !== undefined && result.result.tax_payable !== null && (
                <tr><td style={{ padding: '2px 0' }}>Налог к уплате</td><td style={{ color: '#fbbf24' }}>{result.result.tax_payable.toLocaleString()} ₽</td></tr>
              )}
            </tbody>
          </table>

          {result.result.confidence && result.result.confidence >= 50 && (
            <div style={{ color: '#6ee7b7', fontSize: 10, marginTop: 8 }}>
              ✅ Данные подставлены в форму
            </div>
          )}
        </div>
      )}
    </div>
  );
}
