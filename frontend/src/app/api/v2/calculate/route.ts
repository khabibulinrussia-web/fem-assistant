import { NextRequest, NextResponse } from 'next/server';
import { runFromGraph } from '@/lib/engine';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const graph = body.graph || body;
    const result = runFromGraph(graph);
    return NextResponse.json({ status: 'ok', data: result });
  } catch (err: any) {
    console.error('v2 Calculate error:', err);
    return NextResponse.json({ status: 'error', detail: err.message || 'Unknown error' }, { status: 500 });
  }
}
