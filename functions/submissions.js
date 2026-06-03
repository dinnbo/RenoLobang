// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · functions/submissions.js (Cloudflare Pages Function)
// Called by admin.html to fetch submissions from Supabase by status.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  'Content-Type': 'application/json'
};

export async function onRequestGet(context) {
  const { request, env } = context;

  const adminPassword = request.headers.get('x-admin-password');
  if (adminPassword !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }});
}
