import { NextRequest, NextResponse } from 'next/server';
import { runCalculation } from '@/lib/engine';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const a = body.assumptions || body;
    const result = runCalculation(a);
    return NextResponse.json({ status: 'ok', data: result });
  } catch (err: any) {
    console.error('Calculate error:', err);
    return NextResponse.json({ status: 'error', detail: err.message || 'Unknown error' }, { status: 500 });
  }
}
