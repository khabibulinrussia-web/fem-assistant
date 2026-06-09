import { NextRequest } from 'next/server';

const SERVEO_URL = 'https://404205ef26cb9aee-94-16-117-123.serveousercontent.com';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

async function proxy(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const targetPath = url.pathname.replace(/^\/api/, '') || '/';
    const search = url.search;
    const baseUrl = process.env.SERVEO_URL || SERVEO_URL;
    const targetUrl = `${baseUrl}/api${targetPath}${search}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text().catch(() => undefined);

    const resp = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const respHeaders = new Headers(resp.headers);
    respHeaders.delete('transfer-encoding');
    respHeaders.delete('content-encoding');

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    });
  } catch (err: any) {
    console.error('Proxy error:', err);
    return new Response(
      JSON.stringify({ status: 'error', detail: 'Backend unavailable: ' + (err.message || 'unknown') }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
