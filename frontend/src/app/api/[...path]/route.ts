// Прокси для API расчётов на serveo tunnel
// Использует Node.js runtime для доступа к process.env.SERVEO_URL
export const runtime = 'nodejs';

export async function GET(req: Request) {
  return proxy(req);
}

export async function POST(req: Request) {
  return proxy(req);
}

async function proxy(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\//, '');

  // SERVEO_URL из Vercel env или fallback на текущий рабочий serveo
  const serveoUrl = process.env.SERVEO_URL || 'https://f964129a02b98bdb-193-84-3-248.serveousercontent.com';

  try {
    const targetUrl = `${serveoUrl}/api/${path}${url.search}`;

    const resp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' ? await req.text() : undefined,
    });

    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'API tunnel недоступен',
      detail: String(err),
      serveoUrl,
      path,
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
