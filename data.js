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
  firms: [
  {
    id: "lome-interior-pte-ltd",
    name: "LOME Interior Pte Ltd",
    initials: "LI",
    types: [
      "HDB"
    ],
    established: "",
    website: "",
    affiliates: [],
    description: "",
    reviews: [
      {
        id: "new-966008",
        source: "community",
        published: true,
        date: "2026-06-02",
        author: "Anonymous homeowner",
        sourceUrl: "https://www.reddit.com/r/askSingapore/comments/1pol1l5/interior_design_firm_recommendations/",
        redditUsername: "Pilotboi",
        originalPostDate: "2026-01-01",
        rating: null,
        title: "LOME Interiors at Joo Chiat",
        body: "LOME Interiors at Joo Chiat. Engaged them and the PIC was Marvin. Not sure if he's still working there. But workmanship and quality are 10/10. Been 6 years in my home and all works are solid and of very good quality",
        tags: []
      }
    ]
  }
]
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
