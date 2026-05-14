// Прокси для API расчётов на serveo tunnel
// Edge Runtime — работает в Vercel без Node.js сервера
export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\//, '');
    const serveoUrl = 'https://f964129a02b98bdb-193-84-3-248.serveousercontent.com';
    const targetUrl = `${serveoUrl}/api/${path}${url.search}`;

    const resp = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return new Response(resp.body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\//, '');
    const serveoUrl = 'https://f964129a02b98bdb-193-84-3-248.serveousercontent.com';
    const targetUrl = `${serveoUrl}/api/${path}${url.search}`;
    const bodyText = await req.text();

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
    });

    return new Response(resp.body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
