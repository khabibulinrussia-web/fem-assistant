import { NextRequest, NextResponse } from 'next/server';
import { generateExcel } from '@/lib/excel-export';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const a = body.assumptions || body;
    const buf = await generateExcel(a);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=fem_model.xlsx',
      },
    });
  } catch (err: any) {
    console.error('Excel export error:', err);
    return NextResponse.json({ status: 'error', detail: err.message || 'Unknown error' }, { status: 500 });
  }
}
