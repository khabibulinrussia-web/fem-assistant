// Прокси для API расчётов через serveo tunnel
export const runtime = 'nodejs';

// Fallback hardcoded URL if env not available (serveo URL changes on restart)
const SERVEO_URL = process.env.SERVEO_URL || 'https://e61a676ee8fab351-94-16-117-123.serveousercontent.com';

export async function GET(req: Request) {
  return proxy(req);
}

export async function POST(req: Request) {
  return proxy(req);
}

async function proxy(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\//, '');

  try {
    const targetUrl = `${SERVEO_URL}/api/${path}${url.search}`;

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
      serveoUrl: SERVEO_URL,
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
