// RenoLobang · functions/submit-api.js (Cloudflare Pages Function)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  'Content-Type': 'application/json'
};

function nullIfEmpty(val) {
  if (val === undefined || val === null || val === '') return null;
  return val;
}

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
  try {
    const text = await request.text();
    body = JSON.parse(text);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON: ' + e.message }), { status: 400, headers: corsHeaders });
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

  const payload = {
    firm_id: nullIfEmpty(body.firmId),
    firm_name: body.firmName,
    is_new_firm: body.isNewFirm || false,
    source_type: body.sourceType,
    rating: body.rating ? parseInt(body.rating) : null,
    review_title: nullIfEmpty(body.reviewTitle),
    review_body: body.reviewBody,
    tags: nullIfEmpty(body.tags),
    author_name: nullIfEmpty(body.authorName),
    author_email: nullIfEmpty(body.authorEmail),
    property_type: nullIfEmpty(body.propertyType),
    contract_month: nullIfEmpty(body.contractMonth),
    contract_year: nullIfEmpty(body.contractYear),
    reddit_username: nullIfEmpty(body.redditUsername),
    source_url: nullIfEmpty(body.sourceUrl),
    original_post_date: nullIfEmpty(body.originalPostDate),
    media_url: nullIfEmpty(body.mediaUrl),
    media_source: nullIfEmpty(body.mediaSource),
    image_url: imageUrl,
    status: 'pending'
  };

  const payloadStr = JSON.stringify(payload);
  console.log('Supabase URL:', env.SUPABASE_URL);
  console.log('Payload length:', payloadStr.length);
  console.log('Payload preview:', payloadStr.slice(0, 200));

  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/submissions`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(payloadStr).length),
      'Accept-Encoding': 'identity',
      'Accept': 'application/json',
      'Prefer': 'return=representation'
    },
    body: payloadStr
  });

  const insertText = await insertRes.text();

  if (!insertRes.ok) {
    return new Response(JSON.stringify({ error: insertText }), { status: 500, headers: corsHeaders });
  }

  let record;
  try {
    const insertData = JSON.parse(insertText);
    record = Array.isArray(insertData) ? insertData[0] : insertData;
  } catch {
    return new Response(JSON.stringify({ error: 'Unexpected response from database' }), { status: 500, headers: corsHeaders });
  }

  context.waitUntil(
    fetch(new URL('/notify-api', request.url).toString(), {
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
