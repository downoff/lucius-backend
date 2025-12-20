const express = require('express');
const router = express.Router();

// 1. Industry Data (The "Database" for PSEO)
// In a real app, this might come from a DB or CMS. for now, a structured object is incredibly fast.
const INDUSTRIES = {
  "construction": {
    title: "AI Tender Software for Construction",
    meta_desc: "Automate NEC3, JCT, and Bill of Quantities analysis. Win more construction tenders with AI.",
    keywords: ["construction bids", "NEC3 automation", "quantity surveyor ai"],
    content_block: "Construction tenders are complex. Lucius AI parses Bill of Quantities (BoQ) and identifies risky clauses in JCT and NEC3 contracts instantly."
  },
  "medical": {
    title: "NHS Tender Automation Software",
    meta_desc: "Streamline NHS and Healthcare framework bids. HIPAA/GDPR compliance checking built-in.",
    keywords: ["nhs tenders", "healthcare bids", "medical device procurement"],
    content_block: "Winning NHS contracts requires strict adherence to compliance. Lucius AI automatically checks your bid against the latest NHS Framework requirements."
  },
  "security": {
    title: "Defense & Security Tender AI",
    meta_desc: "Automate MoD and security clearance bids. ISO 27001 compliance matrix generation.",
    keywords: ["defense tenders", "security bids", "mod procurement"],
    content_block: "Defense contracts have zero margin for error. Use our AI to map your ISO 27001 and Cyber Essentials Plus certifications directly to tender requirements."
  }
  // ... scalable to 100s of keys
};

/**
 * GET /api/public/solutions/:industry
 * Dynamic content injection for landing pages.
 */
router.get('/solutions/:industry', (req, res) => {
  const slug = req.params.industry.toLowerCase();
  const data = INDUSTRIES[slug];

  if (!data) {
    // smart fallback for "long tail" 
    // e.g. /solutions/cleaning-services -> Generates generic but relevant content
    const prettyName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return res.json({
      title: `AI Tender Software for ${prettyName}`,
      meta_desc: `Automate your ${prettyName} bids with Lucius AI. Extract requirements and draft proposals in minutes.`,
      content_block: `Stop spending hours reading PDF documents. Use Lucius AI to analyze ${prettyName} tenders and draft winning responses instantly.`,
      is_dynamic: true
    });
  }

  res.json(data);
});

/**
 * GET /api/public/sitemap.xml
 * Auto-generates sitemap for SEO.
 */
router.get('/sitemap.xml', (req, res) => {
  const baseUrl = "https://www.ailucius.com";
  const industryKeys = Object.keys(INDUSTRIES);

  // Also add some "long tail" programmatic keys
  const extraIndustries = ["cleaning", "logistics", "software-development", "legal-services", "catering"];
  const allPages = [...industryKeys, ...extraIndustries];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  // Static pages
  xml += `
    <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
    <url><loc>${baseUrl}/tenders</loc><priority>0.9</priority></url>
    <url><loc>${baseUrl}/pricing</loc><priority>0.8</priority></url>
  `;

  // Dynamic PSEO pages
  allPages.forEach(slug => {
    xml += `
      <url>
        <loc>${baseUrl}/solutions/${slug}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>
    `;
  });

  xml += '</urlset>';

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

module.exports = router;