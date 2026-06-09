// Прокси для API расчётов через serveo tunnel
export const runtime = 'nodejs';

// Fallback hardcoded URL if env not available (serveo URL changes on restart)
const SERVEO_URL = process.env.SERVEO_URL || 'https://e61a676ee8fab351-94-16-117-123.serveousercontent.com';

export async function GET(req: Request) {
<<<<<<< HEAD
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/', '');
    const target = SERVEO_URL + '/api/' + path + url.search;
    const resp = await fetch(target, {
      headers: { 'Content-Type': 'application/json' },
    });
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'API error', detail: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
=======
  return proxy(req);
>>>>>>> d222999c3e74ae6e979f26cb112ffeabbde1fc5c
}

export async function POST(req: Request) {
  return proxy(req);
}

async function proxy(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\//, '');

  // SERVEO_URL из Vercel env или fallback
  const serveoUrl = process.env.SERVEO_URL || 'https://a2097df38c22a85b-77-43-209-168.serveousercontent.com';

  try {
<<<<<<< HEAD
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/', '');
    const target = SERVEO_URL + '/api/' + path + url.search;
    const bodyText = await req.text();
    const resp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
=======
    const targetUrl = `${serveoUrl}/api/${path}${url.search}`;

    const resp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' ? await req.text() : undefined,
>>>>>>> d222999c3e74ae6e979f26cb112ffeabbde1fc5c
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
