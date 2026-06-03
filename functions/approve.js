// RenoLobang · functions/approve.js (Cloudflare Pages Function)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  'Content-Type': 'application/json'
};

const GITHUB_OWNER = 'dinnbo';
const GITHUB_REPO = 'RenoLobang';
const GITHUB_FILE = 'data.js';
const GITHUB_BRANCH = 'main';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-password', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }});
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
});
}

// ── SUPABASE HELPERS ──────────────────────────────────────────────────────────
async function supabaseGet(env, table, filters) {
  const params = Object.entries(filters).map(([k,v]) => `${k}=eq.${v}`).join('&');
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` }
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0] : null;
}

async function supabaseUpdate(env, table, id, updates) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
}

// ── GITHUB HELPERS ────────────────────────────────────────────────────────────
async function fetchDataJs(env) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
    { headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) throw new Error('Could not fetch data.js from GitHub');
  const fileData = await res.json();
  const content = atob(fileData.content.replace(/\n/g, ''));

  // Parse firms array using JSON.parse instead of eval
  const firmsMatch = content.match(/firms:\s*(\[[\s\S]*?\])\s*\n\s*\}/);
  if (!firmsMatch) throw new Error('Could not find firms array in data.js');

  // Convert JS object notation to valid JSON
  const firmsJson = firmsMatch[1]
    .replace(/\/\/[^\n]*/g, '')           // remove comments
    .replace(/,(\s*[}\]])/g, '$1')        // remove trailing commas
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // quote keys

  let firms;
  try {
    firms = JSON.parse(firmsJson);
  } catch(e) {
    throw new Error('Could not parse firms from data.js: ' + e.message);
  }

  return { content, sha: fileData.sha, dataObj: { firms } };
}

function serialise(currentContent, dataObj) {
  const firmsJson = JSON.stringify(dataObj.firms, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:');
  return currentContent.replace(
    /const RENOLOBANG_DATA = {[\s\S]*?};\s*\n\s*\/\/ Helper/,
    `const RENOLOBANG_DATA = {\n  firms: ${firmsJson}\n};\n\n// Helper`
  );
}

async function pushToGitHub(newContent, sha, message, env) {
  const encoded = btoa(unescape(encodeURIComponent(newContent)));
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, content: encoded, sha, branch: GITHUB_BRANCH })
    }
  );
  if (!res.ok) throw new Error('GitHub push failed: ' + await res.text());
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
async function handleReject(submissionId, adminNotes, env) {
  await supabaseUpdate(env, 'submissions', submissionId, {
    status: 'rejected', admin_notes: adminNotes || '', reviewed_at: new Date().toISOString()
  });
  return new Response(JSON.stringify({ success: true, action: 'rejected' }), { status: 200, headers: corsHeaders });
}

async function handleApprove(submissionId, adminNotes, env) {
  const sub = await supabaseGet(env, 'submissions', { id: submissionId });
  if (!sub) return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404, headers: corsHeaders });

  let dataJs;
  try { dataJs = await fetchDataJs(env); } catch (e) {
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

  const firmIdx = dataJs.dataObj.firms.findIndex(f => f.id === sub.firm_id);
  if (firmIdx === -1) {
    const newFirmId = sub.firm_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    dataJs.dataObj.firms.push({
      id: newFirmId, name: sub.firm_name,
      initials: sub.firm_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      types: sub.property_type ? [sub.property_type] : ['HDB'],
      established: '', website: '', affiliates: [], description: '', reviews: [newReview]
    });
  } else {
    dataJs.dataObj.firms[firmIdx].reviews.push(newReview);
  }

  try {
    const newContent = serialise(dataJs.content, dataJs.dataObj);
    await pushToGitHub(newContent, dataJs.sha, `Publish review (${sub.firm_name})`, env);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }

  await supabaseUpdate(env, 'submissions', submissionId, {
    status: 'approved', admin_notes: adminNotes || '',
    reviewed_at: new Date().toISOString(), published_review_id: reviewId
  });

  return new Response(JSON.stringify({ success: true, action: 'approved', reviewId }), { status: 200, headers: corsHeaders });
}

async function handleDelete(submissionId, reviewId, env) {
  if (!reviewId) return new Response(JSON.stringify({ error: 'reviewId required' }), { status: 400, headers: corsHeaders });
  try {
    const dataJs = await fetchDataJs(env);
    let deleted = false;
    for (const firm of dataJs.dataObj.firms) {
      const before = firm.reviews.length;
      firm.reviews = firm.reviews.filter(r => r.id !== reviewId);
      if (firm.reviews.length < before) deleted = true;
    }
    if (!deleted) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404, headers: corsHeaders });
    const newContent = serialise(dataJs.content, dataJs.dataObj);
    await pushToGitHub(newContent, dataJs.sha, `Delete review ${reviewId}`, env);
    if (submissionId) await supabaseUpdate(env, 'submissions', submissionId, { status: 'deleted', reviewed_at: new Date().toISOString() });
    return new Response(JSON.stringify({ success: true, action: 'deleted' }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleEdit(reviewId, updates, env) {
  if (!reviewId) return new Response(JSON.stringify({ error: 'reviewId required' }), { status: 400, headers: corsHeaders });
  try {
    const dataJs = await fetchDataJs(env);
    let found = false;
    for (const firm of dataJs.dataObj.firms) {
      const idx = firm.reviews.findIndex(r => r.id === reviewId);
      if (idx > -1) { firm.reviews[idx] = { ...firm.reviews[idx], ...updates }; found = true; break; }
    }
    if (!found) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404, headers: corsHeaders });
    const newContent = serialise(dataJs.content, dataJs.dataObj);
    await pushToGitHub(newContent, dataJs.sha, `Edit review ${reviewId}`, env);
    return new Response(JSON.stringify({ success: true, action: 'edited' }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
