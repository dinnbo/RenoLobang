// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · data.js
// This file is managed automatically by the admin panel.
// Do NOT edit manually unless you know what you are doing.
//
// TO LINK AFFILIATED FIRMS:
//   Add each firm's id to the other firm's affiliates array on both sides.
//   Example:
//   Firm A: affiliates: ["starry-renovations"]
//   Firm B: affiliates: ["starry-homestead"]
// ─────────────────────────────────────────────────────────────────────────────

const RENOLOBANG_DATA = {
  firms: []
};

// Helper: get firm by id
function getFirmById(id) {
  return RENOLOBANG_DATA.firms.find(f => f.id === id) || null;
}

// Helper: get all firms (published reviews only)
function getAllFirms() {
  return RENOLOBANG_DATA.firms.map(f => ({
    ...f,
    reviews: f.reviews.filter(r => r.published)
  }));
}

// Helper: count by source
function countBySource(firm) {
  const reviews = firm.reviews.filter(r => r.published);
  return {
    verified: reviews.filter(r => r.source === 'verified').length,
    unverified: reviews.filter(r => r.source === 'unverified').length,
    community: reviews.filter(r => r.source === 'community').length,
    media: reviews.filter(r => r.source === 'media').length,
    total: reviews.length
  };
}
