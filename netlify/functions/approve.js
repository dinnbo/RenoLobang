// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · netlify/functions/approve.js
// Called by admin.html when you click Approve or Reject on a submission.
// On approve: updates data.js in GitHub with the new review, triggers redeploy.
// On reject:  just marks the submission as rejected in Supabase.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'dinnbo';
const GITHUB_REPO = 'RenoLobang';
const GITHUB_FILE = 'data.js';
const GITHUB_BRANCH = 'main';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify admin password
  const authHeader = event.headers['x-admin-password'];
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorised' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { submissionId, action, adminNotes } = body;
  if (!submissionId || !action) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing submissionId or action' }) };
  }

  // Get the submission from Supabase
  const { data: sub, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchError || !sub) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Submission not found' }) };
  }

  if (action === 'reject') {
    await supabase.from('submissions').update({
      status: 'rejected',
      admin_notes: adminNotes || '',
      reviewed_at: new Date().toISOString()
    }).eq('id', submissionId);
    return { statusCode: 200, body: JSON.stringify({ success: true, action: 'rejected' }) };
  }

  if (action !== 'approve') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
  }

  // ── APPROVE: update data.js in GitHub ────────────────────────────────────

  // 1. Get current data.js from GitHub
  const ghHeaders = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const fileRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
    { headers: ghHeaders }
  );

  if (!fileRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not fetch data.js from GitHub' }) };
  }

  const fileData = await fileRes.json();
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
  const fileSha = fileData.sha;

  // 2. Parse and update the data
  let dataObj;
  try {
    const match = currentContent.match(/const RENOLOBANG_DATA = ({[\s\S]*?});\s*\n\s*\/\/ Helper/);
    if (!match) throw new Error('Could not find RENOLOBANG_DATA');
    dataObj = eval('(' + match[1] + ')');
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not parse data.js: ' + e.message }) };
  }

  // 3. Build the new review object
  const reviewId = (sub.firm_id || 'new') + '-' + Date.now().toString().slice(-6);
  const contractDate = (sub.contract_year && sub.contract_month)
    ? `${sub.contract_year}-${sub.contract_month}`
    : (sub.contract_year || null);

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

  // 4. Find or create the firm
  let firmIdx = dataObj.firms.findIndex(f => f.id === sub.firm_id);

  if (firmIdx === -1) {
    // New firm – create it
    const newFirmId = sub.firm_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    dataObj.firms.push({
      id: newFirmId,
      name: sub.firm_name,
      initials: sub.firm_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      types: sub.property_type ? [sub.property_type] : ['HDB'],
      established: '',
      website: '',
      affiliates: [],
      description: '',
      reviews: [newReview]
    });
    firmIdx = dataObj.firms.length - 1;
  } else {
    dataObj.firms[firmIdx].reviews.push(newReview);
  }

  // 5. Serialise back to data.js
  const firmsJson = JSON.stringify(dataObj.firms, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:');

  const newContent = currentContent.replace(
    /const RENOLOBANG_DATA = {[\s\S]*?};\s*\n\s*\/\/ Helper/,
    `const RENOLOBANG_DATA = {\n  firms: ${firmsJson}\n};\n\n// Helper`
  );

  // 6. Push to GitHub
  const pushRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify({
        message: `Publish review: ${(newReview.title || newReview.body).slice(0, 60)} (${sub.firm_name})`,
        content: Buffer.from(newContent).toString('base64'),
        sha: fileSha,
        branch: GITHUB_BRANCH
      })
    }
  );

  if (!pushRes.ok) {
    const pushErr = await pushRes.text();
    return { statusCode: 500, body: JSON.stringify({ error: 'GitHub push failed: ' + pushErr }) };
  }

  // 7. Mark submission as approved in Supabase
  await supabase.from('submissions').update({
    status: 'approved',
    admin_notes: adminNotes || '',
    reviewed_at: new Date().toISOString(),
    published_review_id: reviewId
  }).eq('id', submissionId);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, action: 'approved', reviewId })
  };
};

// ── Helper: push updated data.js to GitHub ───────────────────────────────────
async function pushToGitHub(newContent, fileSha, commitMessage) {
  const ghHeaders = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  const pushRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(newContent).toString('base64'),
        sha: fileSha,
        branch: GITHUB_BRANCH
      })
    }
  );
  if (!pushRes.ok) {
    const err = await pushRes.text();
    throw new Error('GitHub push failed: ' + err);
  }
}

// ── Helper: fetch data.js from GitHub ────────────────────────────────────────
async function fetchDataJs() {
  const ghHeaders = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  };
  const fileRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
    { headers: ghHeaders }
  );
  if (!fileRes.ok) throw new Error('Could not fetch data.js from GitHub');
  const fileData = await fileRes.json();
  const content = Buffer.from(fileData.content, 'base64').toString('utf8');
  const match = content.match(/const RENOLOBANG_DATA = ({[\s\S]*?});\s*\n\s*\/\/ Helper/);
  if (!match) throw new Error('Could not find RENOLOBANG_DATA in data.js');
  const dataObj = eval('(' + match[1] + ')');
  return { content, sha: fileData.sha, dataObj };
}

// ── Helper: serialise dataObj back into data.js content ──────────────────────
function serialise(currentContent, dataObj) {
  const firmsJson = JSON.stringify(dataObj.firms, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:');
  return currentContent.replace(
    /const RENOLOBANG_DATA = {[\s\S]*?};\s*\n\s*\/\/ Helper/,
    `const RENOLOBANG_DATA = {\n  firms: ${firmsJson}\n};\n\n// Helper`
  );
}

// ── DELETE handler ────────────────────────────────────────────────────────────
async function handleDelete(submissionId, reviewId, supabase) {
  if (!reviewId) return { statusCode: 400, body: JSON.stringify({ error: 'reviewId required for delete' }) };
  try {
    const { content, sha, dataObj } = await fetchDataJs();
    let deleted = false;
    for (const firm of dataObj.firms) {
      const before = firm.reviews.length;
      firm.reviews = firm.reviews.filter(r => r.id !== reviewId);
      if (firm.reviews.length < before) deleted = true;
    }
    if (!deleted) return { statusCode: 404, body: JSON.stringify({ error: 'Review not found in data.js' }) };
    const newContent = serialise(content, dataObj);
    await pushToGitHub(newContent, sha, `Delete review ${reviewId}`);
    if (submissionId) {
      await supabase.from('submissions').update({ status: 'deleted', reviewed_at: new Date().toISOString() }).eq('id', submissionId);
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, action: 'deleted' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

// ── EDIT handler ──────────────────────────────────────────────────────────────
async function handleEdit(reviewId, updates) {
  if (!reviewId) return { statusCode: 400, body: JSON.stringify({ error: 'reviewId required for edit' }) };
  try {
    const { content, sha, dataObj } = await fetchDataJs();
    let found = false;
    for (const firm of dataObj.firms) {
      const idx = firm.reviews.findIndex(r => r.id === reviewId);
      if (idx > -1) {
        firm.reviews[idx] = { ...firm.reviews[idx], ...updates };
        found = true;
        break;
      }
    }
    if (!found) return { statusCode: 404, body: JSON.stringify({ error: 'Review not found in data.js' }) };
    const newContent = serialise(content, dataObj);
    await pushToGitHub(newContent, sha, `Edit review ${reviewId}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, action: 'edited' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

// ── ROUTER: re-export handler to support multiple actions ─────────────────────
const _originalHandler = module.exports.handler;
module.exports.handler = async (event) => {
  // Check for delete/edit actions before falling through to approve/reject
  if (event.httpMethod === 'POST') {
    const authHeader = event.headers['x-admin-password'];
    if (authHeader !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorised' }) };
    }
    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    if (body.action === 'delete') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      return handleDelete(body.submissionId, body.reviewId, supabase);
    }
    if (body.action === 'edit') {
      return handleEdit(body.reviewId, body.updates);
    }
  }
  return _originalHandler(event);
};
