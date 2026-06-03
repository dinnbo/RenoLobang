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

  // Sanitise strings to remove emoji and non-standard characters
  // that can cause PostgREST PGRST102 errors
  function sanitise(val) {
    if (typeof val !== 'string') return val;
    return val.replace(/[^
