// Temporary debug function - DELETE after testing
export async function onRequest(context) {
  const { request, env } = context;
  return new Response(JSON.stringify({
    hasSupabaseUrl: !!env.SUPABASE_URL,
    hasServiceKey: !!env.SUPABASE_SERVICE_KEY,
    supabaseUrlPrefix: env.SUPABASE_URL ? env.SUPABASE_URL.slice(0, 30) : 'MISSING',
    serviceKeyPrefix: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.slice(0, 10) : 'MISSING'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
