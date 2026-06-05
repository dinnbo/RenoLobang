// RenoLobang · functions/approve-api.js (Cloudflare Pages Function)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  'Content-Type': 'application/json'
};

const GITHUB_OWNER = 'dinnbo';
const GITHUB_REPO = 'RenoLobang';
const GITHUB_BRANCH = 'main';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }});
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (request.headers.get('x-admin-password') !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  const { action, submissionId, reviewId, updates, adminNotes } = body;

  if (action === 'delete') return handleDelete(submissionId, reviewId, env);
  if (action === 'edit') return handleEdit(reviewId, updates, env);
  if (action === 'reject') return handleReject(submissionId, adminNotes, env);
  if (action === 'approve') return handleApprove(submissionId, adminNotes, env);

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
}

// ── SUPABASE ──────────────────────────────────────────────────────────────────
async function sbGet(env, id) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0] : null;
}

async function sbUpdate(env, id, updates) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
}

// ── GITHUB: read and write data.json ─────────────────────────────────────────
const ghHeaders = (token) => ({
  'Authorization': `token ${token}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'RenoLobang-App',
  'Content-Type': 'application/json'
});

async function fetchDataJson(env) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data.json?ref=${GITHUB_BRANCH}`,
    { headers: ghHeaders(env.GITHUB_TOKEN) }
  );
  if (!res.ok) throw new Error(`Could not fetch data.json: ${res.status}`);
  const fileData = await res.json();
  const content = atob(fileData.content.replace(/\n/g, ''));
  const dataObj = JSON.parse(content);
  return { dataObj, sha: fileData.sha };
}

async function pushDataJson(dataObj, sha, message, env) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataObj, null, 2))));
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data.json`,
    {
      method: 'PUT',
      headers: ghHeaders(env.GITHUB_TOKEN),
      body: JSON.stringify({ message, content, sha, branch: GITHUB_BRANCH })
    }
  );
  if (!res.ok) throw new Error(`GitHub push failed: ${res.status} ${await res.text()}`);
}

async function pushDataJs(dataObj, env) {
  // Also update data.js so the frontend HTML pages get the new data
  const firms = JSON.stringify(dataObj.firms);
  const jsContent = `// RenoLobang · data.js - auto-generated, do not edit manually\n\nconst RENOLOBANG_DATA = ${JSON.stringify(dataObj)};\n\nfunction getAllFirms() {\n  return RENOLOBANG_DATA.firms.map(f => ({\n    ...f,\n    reviews: f.reviews.filter(r => r.published)\n  }));\n}\n\nfunction countBySource(firm) {\n  const reviews = firm.reviews.filter(r => r.published);\n  return {\n    verified: reviews.filter(r => r.source === 'verified').length,\n    unverified: reviews.filter(r => r.source === 'unverified').length,\n    community: reviews.filter(r => r.source === 'community').length,\n    media: reviews.filter(r => r.source === 'media').length,\n    total: reviews.length\n  };\n}\n`;

  // Get current data.js sha
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data.js?ref=${GITHUB_BRANCH}`,
    { headers: ghHeaders(env.GITHUB_TOKEN) }
  );
  if (!res.ok) return; // skip if not found
  const fileData = await res.json();

  await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data.js`,
    {
      method: 'PUT',
      headers: ghHeaders(env.GITHUB_TOKEN),
      body: JSON.stringify({
        message: 'Sync data.js from data.json',
        content: btoa(unescape(encodeURIComponent(jsContent))),
        sha: fileData.sha,
        branch: GITHUB_BRANCH
      })
    }
  );
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
async function handleReject(submissionId, adminNotes, env) {
  await sbUpdate(env, submissionId, {
    status: 'rejected',
    admin_notes: adminNotes || '',
    reviewed_at: new Date().toISOString()
  });
  return new Response(JSON.stringify({ success: true, action: 'rejected' }), { status: 200, headers: corsHeaders });
}

async function handleApprove(submissionId, adminNotes, env) {
  const sub = await sbGet(env, submissionId);
  if (!sub) return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404, headers: corsHeaders });

  let dataJson;
  try { dataJson = await fetchDataJson(env); } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }

  const reviewId = (sub.firm_id || 'new') + '-' + Date.now().toString().slice(-6);
  const contractDate = (sub.contract_year && sub.contract_month)
    ? `${sub.contract_year}-${sub.contract_month}` : (sub.contract_year || null);

  const newReview = {
    id: reviewId,
    source: sub.source_type,
    published: true,
    date: new Date().toISOString().slice(0, 10),
    author: sub.author_name || 'Anonymous homeowner',
    ...(sub.source_url && { sourceUrl: sub.source_url }),
    ...(sub.reddit_username && { redditUsername: sub.reddit_username }),
    ...(sub.original_post_date && { originalPostDate: sub.original_post_date }),
    ...(sub.media_url && { mediaUrl: sub.media_url }),
    ...(sub.media_source && { mediaSource: sub.media_source }),
    rating: sub.rating || null,
    title: sub.review_title || null,
    body: sub.review_body,
    tags: sub.tags ? sub.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    ...(sub.property_type && { propertyType: sub.property_type }),
    ...(contractDate && { contractDate }),
    ...(sub.image_url && { imageUrl: sub.image_url })
  };

  const firmIdx = dataJson.dataObj.firms.findIndex(f => f.id === sub.firm_id);
  if (firmIdx === -1) {
    const newFirmId = sub.firm_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    dataJson.dataObj.firms.push({
      id: newFirmId, name: sub.firm_name,
      initials: sub.firm_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      types: sub.property_type ? [sub.property_type] : ['HDB'],
      established: '', website: '', affiliates: [], description: '', reviews: [newReview]
    });
  } else {
    dataJson.dataObj.firms[firmIdx].reviews.push(newReview);
  }

  try {
    await pushDataJson(dataJson.dataObj, dataJson.sha, `Publish review (${sub.firm_name})`, env);
    await pushDataJs(dataJson.dataObj, env);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }

  await sbUpdate(env, submissionId, {
    status: 'approved', admin_notes: adminNotes || '',
    reviewed_at: new Date().toISOString(), published_review_id: reviewId
  });

  return new Response(JSON.stringify({ success: true, action: 'approved', reviewId }), { status: 200, headers: corsHeaders });
}

async function handleDelete(submissionId, reviewId, env) {
  if (!reviewId) return new Response(JSON.stringify({ error: 'reviewId required' }), { status: 400, headers: corsHeaders });
  try {
    const dataJson = await fetchDataJson(env);
    let deleted = false;
    for (const firm of dataJson.dataObj.firms) {
      const before = firm.reviews.length;
      firm.reviews = firm.reviews.filter(r => r.id !== reviewId);
      if (firm.reviews.length < before) deleted = true;
    }
    if (!deleted) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404, headers: corsHeaders });
    await pushDataJson(dataJson.dataObj, dataJson.sha, `Delete review ${reviewId}`, env);
    await pushDataJs(dataJson.dataObj, env);
    if (submissionId) await sbUpdate(env, submissionId, { status: 'deleted', reviewed_at: new Date().toISOString() });
    return new Response(JSON.stringify({ success: true, action: 'deleted' }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleEdit(reviewId, updates, env) {
  if (!reviewId) return new Response(JSON.stringify({ error: 'reviewId required' }), { status: 400, headers: corsHeaders });
  try {
    const dataJson = await fetchDataJson(env);
    let found = false;
    for (const firm of dataJson.dataObj.firms) {
      const idx = firm.reviews.findIndex(r => r.id === reviewId);
      if (idx > -1) { firm.reviews[idx] = { ...firm.reviews[idx], ...updates }; found = true; break; }
    }
    if (!found) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404, headers: corsHeaders });
    await pushDataJson(dataJson.dataObj, dataJson.sha, `Edit review ${reviewId}`, env);
    await pushDataJs(dataJson.dataObj, env);
    return new Response(JSON.stringify({ success: true, action: 'edited' }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
