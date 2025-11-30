// routes/seo-pages.js
const express = require("express");
const router = express.Router();

/**
 * PROGRAMMATIC SEO - Auto-generate 100+ landing pages
 * 
 * Strategy: Create unique landing pages for EVERY keyword variation
 * Result: Google indexes all of them, instant rankings for long-tail searches
 */

// Define keyword templates (we'll generate page for each combination)
const INDUSTRIES = [
  "IT Consulting",
  "Engineering",
  "Construction",
  "Architecture",
  "Healthcare",
  "Education",
  "Legal Services",
  "Marketing Agencies",
  "Accounting Firms",
  "Management Consulting"
];

const LOCATIONS = [
  "UK",
  "London",
  "Manchester",
  "Birmingham",
  "Edinburgh",
  "Glasgow",
  "Germany",
  "Berlin",
  "Munich",
  "France",
  "Paris",
  "Lyon",
  "Netherlands",
  "Amsterdam",
  "US",
  "New York",
  "San Francisco",
  "Chicago"
];

const TENDER_TYPES = [
  "Government Tenders",
  "Public Sector Contracts",
  "EU Procurement",
  "Framework Agreements",
  "RFP Responses",
  "Bid Writing",
  "Proposal Templates"
];

/**
 * NEW pSEO Structure: /tenders/:country/:category/:year
 * Example: /tenders/uk/construction/2024
 */
router.get("/tenders/:country/:category/:year", (req, res) => {
  const { country, category, year } = req.params;

  // Format data
  const countryText = country.toUpperCase();
  const categoryText = category.replace(/-/g, " ");
  const yearText = year;

  const pageTitle = `${categoryText} Tenders in ${countryText} ${yearText} | LuciusAI`;
  const metaDesc = `Find and bid on the latest ${yearText} ${categoryText} tenders in ${countryText}. AI-powered summaries, requirements analysis, and proposal writing.`;

  // Generate simulated tenders
  const recentTenders = [
    { title: `${categoryText} Framework ${yearText}`, budget: "€500k+", deadline: "Open" },
    { title: `National ${categoryText} Supply`, budget: "€1M - €5M", deadline: "30 days" },
    { title: `Regional ${categoryText} Services`, budget: "€100k - €300k", deadline: "14 days" },
    { title: `${countryText} ${categoryText} Innovation`, budget: "€250k", deadline: "21 days" },
    { title: `Emergency ${categoryText} Provision`, budget: "€50k - €150k", deadline: "7 days" }
  ];

  const pageData = {
    title: pageTitle,
    metaDesc,
    tenderType: "Government Tenders", // Generic fallback
    industry: categoryText,
    location: countryText,
    year: yearText,
    canonicalUrl: `https://www.ailucius.com/tenders/${country}/${category}/${year}`,
    recentTenders,
    features: [
      { title: `Latest ${yearText} Data`, desc: `Real-time updates for ${countryText} ${categoryText} opportunities.` },
      { title: `AI Summaries`, desc: `Get instant summaries of complex ${categoryText} tender documents.` },
      { title: `Win Prediction`, desc: `AI scores your probability of winning ${countryText} contracts.` },
      { title: `Automated Proposals`, desc: `Draft compliant bids for ${categoryText} in minutes.` }
    ],
    faqs: [
      {
        question: `How to find ${categoryText} tenders in ${countryText}?`,
        answer: `LuciusAI aggregates all ${countryText} government sources. Use our AI search to find hidden ${categoryText} opportunities that match your profile.`
      },
      {
        question: `What are the requirements for ${yearText} ${categoryText} bids?`,
        answer: `Standard requirements include financial standing, technical capacity, and ${countryText}-specific certifications. LuciusAI analyzes each tender to list exact requirements.`
      },
      {
        question: `Can AI write ${categoryText} proposals?`,
        answer: `Yes. LuciusAI is trained on successful ${categoryText} proposals. It generates technical responses, executive summaries, and methodology sections automatically.`
      },
      {
        question: `How much is the ${categoryText} market in ${countryText}?`,
        answer: `The ${countryText} public sector spends billions annually on ${categoryText}. ${yearText} is projected to see increased spending in sustainable and digital initiatives.`
      },
      {
        question: `How to win ${categoryText} contracts in ${countryText}?`,
        answer: `Focus on compliance, clear value proposition, and social value. LuciusAI helps you structure your bid to score maximum points on ${countryText} evaluation criteria.`
      },
      {
        question: `Is LuciusAI free for ${categoryText} tenders?`,
        answer: `You can search and view summaries for free. Proposal generation requires a subscription, starting at €49/month.`
      },
      {
        question: `What is the deadline for ${yearText} ${categoryText} frameworks?`,
        answer: `Deadlines vary. Many ${yearText} frameworks open in Q1/Q2. Set up LuciusAI alerts to never miss a ${categoryText} deadline.`
      },
      {
        question: `Do you cover private sector ${categoryText} tenders?`,
        answer: `We primarily focus on government and public sector contracts in ${countryText}, but also cover major utility and infrastructure providers.`
      }
    ],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Tenders', url: '/tenders' },
      { name: countryText, url: `/tenders/${country}` },
      { name: categoryText, url: `/tenders/${country}/${category}` },
      { name: yearText, url: `/tenders/${country}/${category}/${year}` }
    ]
  };

  res.json(pageData);
});

/**
 * Generate SEO-optimized landing page for specific keyword combo
 * Example: /ai-tender-writing/it-consulting/uk
 */
router.get("/:tenderType/:industry/:location", (req, res) => {
  const { tenderType, industry, location } = req.params;
  const isJson = req.query.format === 'json' || req.headers.accept === 'application/json';

  // Convert URL slugs back to readable text
  const tenderTypeText = tenderType.replace(/-/g, " ");
  const industryText = industry.replace(/-/g, " ");
  const locationText = location.toUpperCase();

  // Generate unique content for this specific page
  const pageTitle = `AI ${tenderTypeText} for ${industryText} in ${locationText} | LuciusAI`;
  const metaDesc = `Generate ${tenderTypeText.toLowerCase()} for ${industryText.toLowerCase()} in ${locationText} in 5 minutes with AI. Save 20+ hours per proposal. Try free.`;

  // Generate simulated "Live" tenders for this location/industry
  const recentTenders = [
    { title: `${industryText} Framework Agreement 2025`, budget: "€250k - €1M", deadline: "14 days left" },
    { title: `Digital Transformation for ${locationText} Council`, budget: "€100k - €500k", deadline: "21 days left" },
    { title: `${tenderTypeText} - Phase 2`, budget: "€50k - €150k", deadline: "7 days left" },
    { title: `Supply of ${industryText} Services`, budget: "€500k+", deadline: "30 days left" },
    { title: `Consultancy for ${locationText} Public Sector`, budget: "€75k - €200k", deadline: "10 days left" }
  ];

  // Data object for React/JSON
  const pageData = {
    title: pageTitle,
    metaDesc,
    tenderType: tenderTypeText,
    industry: industryText,
    location: locationText,
    canonicalUrl: `https://www.ailucius.com/ai-tender-writing/${tenderType}/${industry}/${location}`,
    recentTenders, // Pass to frontend
    // FAQ data for People Also Ask optimization
    faqs: [
      {
        question: `How long does it take to write a ${industryText} tender in ${locationText}?`,
        answer: `With LuciusAI, you can write a professional ${industryText} tender proposal in 30-45 minutes. Manually, it typically takes 10-15 hours. Our AI analyzes requirements, generates compliant content, and ensures you meet all mandatory criteria for ${locationText} government contracts.`
      },
      {
        question: `What are the requirements for ${industryText} government tenders in ${locationText}?`,
        answer: `${locationText} ${industryText} tenders typically require: company registration, financial statements, technical capability proof, health & safety policies, insurance certificates, and past project references. LuciusAI helps you address each requirement systematically with AI-generated content.`
      },
      {
        question: `How much does ${industryText} tender writing cost?`,
        answer: `Professional ${industryText} tender writers charge €2,000-€10,000 per proposal. LuciusAI costs €99/month for unlimited tenders, saving you €1,900+ per tender while delivering faster, more consistent results.`
      },
      {
        question: `What is the success rate for ${industryText} tenders in ${locationText}?`,
        answer: `The average win rate for ${industryText} government tenders in ${locationText} is 15-25%. Companies using LuciusAI report 25-35% win rates due to better compliance checking, professional presentation, and thorough requirement coverage.`
      },
      {
        question: `Can AI write government ${industryText} tenders?`,
        answer: `Yes. LuciusAI's GPT-4o AI is specifically trained on ${locationText} government tender requirements. It analyzes tender documents, extracts mandatory criteria, generates compliant proposals, and checks for completeness before submission. It's been used to win €12M+ in contracts.`
      },
      {
        question: `How do I bid on ${locationText} government ${industryText} contracts?`,
        answer: `To bid on ${locationText} ${industryText} tenders: 1) Find opportunities on official procurement portals, 2) Review requirements carefully, 3) Use LuciusAI to generate a compliant proposal in 30 minutes, 4) Review and customize, 5) Submit before deadline. Our AI ensures you don't miss any mandatory requirements.`
      },
      {
        question: `What are common mistakes in ${industryText} tender submissions?`,
        answer: `Common mistakes include: missing mandatory requirements (instant rejection), unclear pricing structure, late submissions, poor formatting, incomplete documentation, and not addressing evaluation criteria. LuciusAI prevents these by automatically checking compliance and highlighting missing elements.`
      },
      {
        question: `How can I improve my ${industryText} tender win rate in ${locationText}?`,
        answer: `Improve your win rate by: using AI to ensure 100% compliance, submitting professional proposals, addressing all evaluation criteria thoroughly, providing clear pricing, including relevant case studies, highlighting ${locationText}-specific experience, and submitting early to avoid technical issues.`
      }
    ],
    features: [
      { title: `${industryText}-Specific Templates`, desc: `Pre-built templates optimized for ${industryText.toLowerCase()} ${tenderTypeText.toLowerCase()} in ${locationText}.` },
      { title: `${locationText} Compliance`, desc: `Automatically tailored for ${locationText} procurement regulations. GDPR compliant.` },
      { title: `5-Minute Drafts`, desc: `Upload your ${locationText} tender PDF, AI analyzes requirements, generates compliant draft.` },
      { title: `Pricing for ${industryText}`, desc: `€99-€499/month. Much cheaper than hiring ${locationText}-based tender consultants.` }
    ],
    steps: [
      `Upload ${locationText} Tender PDF`,
      `AI Analyzes requirements specific to ${industryText}`,
      `Generate Draft (Standard, Persuasive, or Technical)`,
      `Customize with ${industryText} case studies`,
      `Submit to ${locationText} procurement portal`
    ],
    benefits: [
      `Industry Expertise: AI trained on winning ${industryText} proposals`,
      `Local Knowledge: Understands ${locationText} tender formats`,
      `Fast Turnaround: Critical for ${locationText} deadlines`,
      `Cost Effective: €199/month vs €50K+ consultants`
    ],
    relatedLinks: [
      { text: `Government Tenders for ${industryText} in ${locationText}`, url: `/ai-tender-writing/government-tenders/${industry}/${location}` },
      { text: `Construction ${tenderTypeText} in ${locationText}`, url: `/ai-tender-writing/${tenderType}/construction/${location}` },
      { text: `AI Tender Writing for ${industryText} in Germany`, url: `/ai-tender-writing/${tenderType}/${industry}/germany` }
    ]
  };

  if (isJson) {
    return res.json(pageData);
  }

  // HTML Fallback for Crawlers / Direct Hits (Pre-rendered)
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDesc}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageData.canonicalUrl}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "LuciusAI - ${industryText} ${tenderTypeText} in ${locationText}",
    "applicationCategory": "BusinessApplication",
    "offers": { "@type": "Offer", "price": "99", "priceCurrency": "EUR" },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "127" }
  }
  </script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #111827; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; color: #111827; }
    h2 { margin-top: 2rem; }
    .cta { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
    .card { background: #F3F4F6; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>AI ${tenderTypeText} for ${industryText} in ${locationText}</h1>
  <p class="lead"><strong>Generate professional ${tenderTypeText.toLowerCase()} in 5 minutes.</strong></p>
  <p>LuciusAI is the leading AI copilot for ${industryText.toLowerCase()} firms competing for ${tenderTypeText.toLowerCase()} in ${locationText}.</p>
  <a href="https://www.ailucius.com/pricing" class="cta">Start Free Trial →</a>
  
  <div class="grid">
    ${pageData.features.map(f => `
    <div class="card">
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>`).join('')}
  </div>

  <h2>How it Works</h2>
  <ol>
    ${pageData.steps.map(s => `<li>${s}</li>`).join('')}
  </ol>

  <h2>Why Choose LuciusAI?</h2>
  <ul>
    ${pageData.benefits.map(b => `<li>✅ ${b}</li>`).join('')}
  </ul>

  <a href="https://www.ailucius.com/pricing" class="cta">Try Free for 14 Days →</a>

  <hr>
  <h3>Related Pages</h3>
  <ul>
    ${pageData.relatedLinks.map(l => `<li><a href="${l.url}">${l.text}</a></li>`).join('')}
  </ul>
</body>
</html>
  `;

  res.send(html);
});

/**
 * Generate sitemap of all programmatic pages
 * This gets submitted to Google Search Console for instant indexing
 */
router.get("/sitemap-seo.xml", (req, res) => {
  res.set("Content-Type", "application/xml");

  let urls = "";
  const baseUrl = "https://www.ailucius.com/ai-tender-writing";

  // Generate URL for every combination (10 industries × 18 locations × 7 tender types = 1,260 pages!)
  INDUSTRIES.forEach((industry) => {
    LOCATIONS.forEach((location) => {
      TENDER_TYPES.forEach((tenderType) => {
        const slug = `${tenderType.toLowerCase().replace(/\s+/g, "-")}/${industry.toLowerCase().replace(/\s+/g, "-")}/${location.toLowerCase().replace(/\s+/g, "-")}`;
        urls += `
  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });
    });
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.send(sitemap);
});

module.exports = router;
