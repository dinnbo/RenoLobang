// ─────────────────────────────────────────────────────────────────────────────
// RenoLobang · data.js
// This is the single file you edit to manage all firms and reviews.
//
// TO ADD A NEW FIRM:   copy one firm block and fill in the details.
// TO ADD A REVIEW:     copy one review block under the right firm.
// TO PUBLISH:          set published: true on the review.
//
// TO LINK AFFILIATED FIRMS:
//   Add each firm's id to the other firm's affiliates array.
//   Example: Firm A (id: "starry-homestead") and Firm B (id: "starry-renovations")
//   In Firm A: affiliates: ["starry-renovations"]
//   In Firm B: affiliates: ["starry-homestead"]
//   Both sides must be updated for the link to show on both firm pages.
// ─────────────────────────────────────────────────────────────────────────────

const RENOLOBANG_DATA = {
  firms: [
    {
      id: "weiken",
      name: "Weiken.com",
      initials: "WK",
      types: ["HDB", "BTO", "Condo"],
      established: "2000",
      website: "https://www.weiken.com",
      affiliates: [],
      description: "One of Singapore's larger interior design firms, known for their structured renovation process and 3D rendering previews.",
      reviews: [
        {
          id: "wk-001",
          source: "verified",
          published: true,
          date: "2024-11-15",
          author: "Homeowner, Sengkang BTO",
          rating: 4,
          title: "Good experience overall, minor hiccups on timeline",
          body: "Our designer was responsive and the 3D renders really helped us visualise the space before committing. Carpentry quality was solid. Main gripe was a 2-week delay on handover that wasn't communicated proactively – we had to chase. Would still recommend but manage your timeline expectations.",
          tags: ["carpentry", "communication", "timeline"]
        },
        {
          id: "wk-002",
          source: "community",
          published: true,
          date: "2024-09-03",
          author: "Reddit u/bto_survivor",
          sourceUrl: "https://reddit.com",
          rating: 3,
          title: "Decent but felt like a number",
          body: "Got assigned a junior designer who changed halfway through. End result was fine but the process felt a bit factory-like given how many projects they run concurrently. Price was fair for the market.",
          tags: ["project management", "pricing"]
        },
        {
          id: "wk-003",
          source: "community",
          published: true,
          date: "2024-07-20",
          author: "HardwareZone forum",
          sourceUrl: "https://forums.hardwarezone.com.sg",
          rating: 5,
          title: "Very happy with the outcome",
          body: "Engaged them for a 4-room HDB resale. Designer was patient with our many changes and the final result exceeded expectations. Would recommend for HDB projects.",
          tags: ["HDB", "resale", "design"]
        }
      ]
    },
    {
      id: "fineline-design",
      name: "Fineline Design",
      initials: "FD",
      types: ["Condo", "Landed"],
      established: "2005",
      website: "",
      affiliates: [],
      description: "Boutique firm focused on condo and landed property renovations with an emphasis on contemporary design.",
      reviews: [
        {
          id: "fd-001",
          source: "verified",
          published: true,
          date: "2024-12-01",
          author: "Homeowner, Bishan Condo",
          rating: 5,
          title: "Exceptional design sensibility",
          body: "Our designer really listened to our brief and pushed back when our ideas wouldn't have worked spatially – in a good way. The end result was beyond what we imagined. Premium pricing but worth it for a condo renovation.",
          tags: ["design", "condo", "premium"]
        },
        {
          id: "fd-002",
          source: "media",
          published: true,
          date: "2024-06-10",
          author: "Home & Decor Singapore",
          sourceUrl: "https://homeanddeckor.com.sg",
          rating: null,
          title: "Featured: Sustainable renovation choices",
          body: "Fineline Design was highlighted for their use of sustainable materials and low-VOC finishes across their recent condo projects, part of a wider feature on eco-conscious ID firms in Singapore.",
          tags: ["sustainability", "media", "condo"]
        }
      ]
    },
    {
      id: "meter-square",
      name: "Meter Square",
      initials: "MS",
      types: ["HDB", "BTO"],
      established: "2012",
      website: "",
      affiliates: [],
      description: "Mid-range firm popular with BTO homeowners for their structured packages and clear pricing.",
      reviews: [
        {
          id: "ms-001",
          source: "community",
          published: true,
          date: "2024-10-05",
          author: "Reddit u/hdb_homeowner_sg",
          sourceUrl: "https://reddit.com",
          rating: 4,
          title: "Good communication, tiling issues",
          body: "Designer was great to work with. Had an issue with a subcontractor's tiling – some uneven grout lines – but the firm rectified it after we flagged it. Response time was fast.",
          tags: ["tiling", "rectification", "BTO"]
        },
        {
          id: "ms-002",
          source: "community",
          published: true,
          date: "2024-08-14",
          author: "Facebook group: Singapore Home Renovation",
          sourceUrl: "https://facebook.com",
          rating: 3,
          title: "Average experience",
          body: "Nothing bad, nothing exceptional. They delivered what was in the contract. Designer was sometimes hard to reach on weekdays. Pricing was transparent which I appreciated.",
          tags: ["pricing", "communication"]
        }
      ]
    },
    {
      id: "starry-homestead",
      name: "Starry Homestead",
      initials: "SH",
      types: ["HDB", "Condo"],
      established: "2010",
      website: "",
      affiliates: ["starry-renovations"],
      description: "Established firm with a wide portfolio across HDB and condo projects.",
      reviews: [
        {
          id: "sh-001",
          source: "verified",
          published: true,
          date: "2024-11-28",
          author: "Homeowner, Tampines HDB",
          rating: 4,
          title: "Solid project management",
          body: "The project manager was on the ball – sent weekly updates and flagged issues before they became problems. Only feedback is that the quotation increased about 8% after we signed, due to material cost changes. Would have preferred this was flagged upfront.",
          tags: ["project management", "quotation", "HDB"]
        },
        {
          id: "sh-002",
          source: "media",
          published: true,
          date: "2024-05-01",
          author: "Home & Decor Singapore",
          sourceUrl: "https://homeanddeckor.com.sg",
          rating: null,
          title: "Media feature",
          body: "Featured as part of Home & Decor's annual list of notable renovation firms in Singapore, cited for consistent project delivery across both HDB and condo segments.",
          tags: ["media", "award"]
        }
      ]
    },
    {
      id: "starry-renovations",
      name: "Starry Renovations",
      initials: "SR",
      types: ["HDB"],
      established: "2015",
      website: "",
      affiliates: ["starry-homestead"],
      description: "HDB-focused arm affiliated with Starry Homestead, handling more budget-conscious renovation projects.",
      reviews: [
        {
          id: "sr-001",
          source: "community",
          published: true,
          date: "2024-09-22",
          author: "Reddit u/firsthome_sg",
          sourceUrl: "https://reddit.com",
          rating: 3,
          title: "Budget-friendly, expect what you pay for",
          body: "Went with them for a tighter budget. The result was acceptable but you can tell where corners were cut on material quality. Designer was helpful but clearly managing many projects at once.",
          tags: ["budget", "HDB", "value"]
        }
      ]
    },
    {
      id: "absolook",
      name: "Absolook Interior Design",
      initials: "AI",
      types: ["HDB", "Condo"],
      established: "2008",
      website: "",
      affiliates: [],
      description: "Full-service ID firm with a strong track record in HDB and condo renovations across Singapore.",
      reviews: [
        {
          id: "ab-001",
          source: "verified",
          published: true,
          date: "2024-10-30",
          author: "Homeowner, Punggol BTO",
          rating: 4,
          title: "Great carpentry, slow after-sales",
          body: "The carpentry work was genuinely excellent – solid, well-fitted, no gaps. Main issue was response time after handover when we had some minor touch-up requests. Took about 3 weeks to get anyone on-site.",
          tags: ["carpentry", "after-sales", "BTO"]
        },
        {
          id: "ab-002",
          source: "community",
          published: true,
          date: "2024-07-08",
          author: "Reddit u/renovationsg",
          sourceUrl: "https://reddit.com",
          rating: 4,
          title: "Good value, recommend for HDB",
          body: "Used them for a 5-room HDB resale. Good value for the price point. Designer was attentive during the planning phase. Slight delay of about a week on handover.",
          tags: ["HDB", "value", "resale"]
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
