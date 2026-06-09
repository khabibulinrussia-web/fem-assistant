import { NextRequest } from 'next/server';
import { generateExcel } from '@/lib/excel-export';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const a = body.assumptions || body;
    const buf = await generateExcel(a);
    return new Response(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=fem_model.xlsx',
      },
    });
  } catch (err: any) {
    console.error('Excel export error:', err);
    return new Response(JSON.stringify({ status: 'error', detail: err.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
