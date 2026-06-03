// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · functions/submit.js (Cloudflare Pages Function)
// Receives form submissions and saves them to Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Content-Type': 'application/json'
  };

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

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Handle image upload if provided
  let imageUrl = null;
  if (body.imageBase64 && body.imageFileName) {
    try {
      const imageBuffer = Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0));
      const fileName = `${Date.now()}-${body.imageFileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const { error: uploadError } = await supabase.storage
        .from('review-images')
        .upload(fileName, imageBuffer, { contentType: body.imageContentType || 'image/jpeg', upsert: false });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    } catch (e) { console.error('Image error:', e); }
  }

  const { data, error } = await supabase.from('submissions').insert([{
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
  }]).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  // Fire and forget email notification
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

  return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }});
}
