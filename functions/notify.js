// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · functions/notify.js (Cloudflare Pages Function)
// Sends email notification to admin when a new submission arrives.
// ─────────────────────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const { firmName, sourceType, reviewTitle, authorName } = body;

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
          <tr><td style="padding:6px 12px 6px 0;color:#666">Title</td><td style="padding:6px 0">${reviewTitle || '(no title)'}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666">Submitted by</td><td style="padding:6px 0">${authorName || 'Anonymous'}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="https://renolobang.pages.dev/admin.html" style="background:#1D9E75;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:14px">
            Review in admin panel
          </a>
        </p>
      `
    })
  });

  return new Response(JSON.stringify({ emailSent: res.ok }), { status: 200 });
}
