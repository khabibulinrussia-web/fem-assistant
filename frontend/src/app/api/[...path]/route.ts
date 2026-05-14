// Прокси для API расчётов через serveo tunnel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\//, '');
    const serveoUrl = process.env.SERVEO_URL || 'https://f964129a02b98bdb-193-84-3-248.serveousercontent.com';
    const targetUrl = `${serveoUrl}/api/${path}${url.search}`;

    const resp = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return Response.json({
      error: 'API tunnel недоступен',
      detail: String(err),
    }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\//, '');
    const serveoUrl = process.env.SERVEO_URL || 'https://f964129a02b98bdb-193-84-3-248.serveousercontent.com';
    const targetUrl = `${serveoUrl}/api/${path}${url.search}`;
    const bodyText = await req.text();

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
      signal: AbortSignal.timeout(15000),
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return Response.json({
      error: 'API tunnel недоступен',
      detail: String(err),
    }, { status: 502 });
  }
}
