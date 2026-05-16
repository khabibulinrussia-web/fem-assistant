// Прокси для API расчётов на serveo tunnel
export const runtime = 'edge';

const SERVEO_URL = 'https://b03ce76a4ca218ae-193-84-3-248.serveousercontent.com';

export async function GET(req: Request) {
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
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/', '');
    const target = SERVEO_URL + '/api/' + path + url.search;
    const bodyText = await req.text();
    const resp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
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
}
