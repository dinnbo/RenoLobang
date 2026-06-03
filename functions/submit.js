// RenoLobang · functions/submit.js (Cloudflare Pages Function)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  'Content-Type': 'application/json'
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }});
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  if (!body.firmName) return new Response(JSON.stringify({ error: 'Firm name is required' }), { status: 400, headers: corsHeaders });
  if (!body.reviewBody) return new Response(JSON.stringify({ error: 'Review body is required' }), { status: 400, headers: corsHeaders });
  if (!body.sourceType) return new Response(JSON.stringify({ error: 'Source type is required' }), { status: 400, headers: corsHeaders });
  if (body.sourceType !== 'community' && body.sourceType !== 'media' && !body.authorEmail) {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: corsHeaders });
  }

  let imageUrl = null;
  if (body.imageBase64 && body.imageFileName) {
    try {
      const imageBuffer = Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0));
      const fileName = `${Date.now()}-${body.imageFileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const uploadRes = await fetch(`${env.SUPABASE_URL}/storage/v1/object/review-images/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': body.imageContentType || 'image/jpeg'
        },
        body: imageBuffer
      });
      if (uploadRes.ok) {
        imageUrl = `${env.SUPABASE_URL}/storage/v1/object/public/review-images/${fileName}`;
      }
    } catch (e) {
      console.error('Image error:', e);
    }
  }

  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/submissions`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      firm_id: body.firmId || null,
      firm_name: body.firmName,
      is_new_firm: body.isNewFirm || false,
      source_type: body.sourceType,
      rating: body.rating ? parseInt(body.rating) : null,
      review_title: body.reviewTitle || null,
      review_body: body.reviewBody,
      tags: body.tags || null,
      author_name: body.authorName || null,
      author_email: body.authorEmail || null,
      property_type: body.propertyType || null,
      contract_month: body.contractMonth || null,
      contract_year: body.contractYear || null,
      reddit_username: body.redditUsername || null,
      source_url: body.sourceUrl || null,
      original_post_date: body.originalPostDate || null,
      media_url: body.mediaUrl || null,
      media_source: body.mediaSource || null,
      image_url: imageUrl,
      status: 'pending'
    })
  });

  const insertData = await insertRes.json();
  if (!insertRes.ok) {
    return new Response(JSON.stringify({ error: JSON.stringify(insertData) }), { status: 500, headers: corsHeaders });
  }

  const record = Array.isArray(insertData) ? insertData[0] : insertData;

  context.waitUntil(
    fetch(new URL('/functions/notify', request.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firmName: body.firmName,
        sourceType: body.sourceType,
        reviewTitle: body.reviewTitle,
        authorName: body.authorName
      })
    }).catch(e => console.error('Notify error:', e))
  );

  return new Response(JSON.stringify({ success: true, id: record.id }), { status: 200, headers: corsHeaders });
}
