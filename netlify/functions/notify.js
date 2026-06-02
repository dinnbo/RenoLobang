// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · netlify/functions/notify.js
// Called after a submission is saved to Supabase.
// Sends an email notification to the admin via Resend (free tier, 100 emails/day).
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { firmName, sourceType, reviewTitle, authorName } = body;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('No Resend API key, skipping email notification');
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'RenoLobang <notifications@renolobang.sg>',
      to: ['eleen@duck.com'],
      subject: `New review submission: ${firmName}`,
      html: `
        <h2>New review submission on RenoLobang</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:6px 12px 6px 0;color:#666">Firm</td><td style="padding:6px 0"><strong>${firmName}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666">Source</td><td style="padding:6px 0">${sourceType}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666">Title</td><td style="padding:6px 0">${reviewTitle || '(auto-generated)'}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666">Submitted by</td><td style="padding:6px 0">${authorName || 'Anonymous'}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="https://renolobang.netlify.app/admin.html" style="background:#1D9E75;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:14px">
            Review in admin panel
          </a>
        </p>
      `
    })
  });

  if (!res.ok) {
    console.error('Resend error:', await res.text());
    return { statusCode: 200, body: JSON.stringify({ emailSent: false }) };
  }

  return { statusCode: 200, body: JSON.stringify({ emailSent: true }) };
};
