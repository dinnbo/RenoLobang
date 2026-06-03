// RenoLobang · functions/submissions.js (Cloudflare Pages Function)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  'Content-Type': 'application/json'
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-password', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }});
  }
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (request.headers.get('x-admin-password') !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/submissions?status=eq.${status}&order=created_at.desc`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  const data = await res.json();
  if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: 500, headers: corsHeaders });
  return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
}
}
