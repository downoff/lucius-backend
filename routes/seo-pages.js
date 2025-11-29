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
 * Generate SEO-optimized landing page for specific keyword combo
 * Example: /ai-tender-writing/it-consulting/uk
 */
router.get("/:tenderType/:industry/:location", (req, res) => {
    const { tenderType, industry, location } = req.params;

    // Convert URL slugs back to readable text
    const tenderTypeText = tenderType.replace(/-/g, " ");
    const industryText = industry.replace(/-/g, " ");
    const locationText = location.toUpperCase();

    // Generate unique content for this specific page
    const pageTitle = `AI ${tenderTypeText} for ${industryText} in ${locationText} | LuciusAI`;
    const metaDesc = `Generate ${tenderTypeText.toLowerCase()} for ${industryText.toLowerCase()} in ${locationText} in 5 minutes with AI. Save 20+ hours per proposal. Try free.`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDesc}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.ailucius.com/ai-tender-writing/${tenderType}/${industry}/${location}">
  
  <!-- Schema Markup for Rich Snippets -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "LuciusAI - ${industryText} ${tenderTypeText} in ${locationText}",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "99",
      "priceCurrency": "EUR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    }
  }
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 2.5rem; margin-bottom: 20px; }
    .cta { display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
    .feature { background: #F9FAFB; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>AI ${tenderTypeText} for ${industryText} in ${locationText}</h1>
  
  <p><strong>Generate professional ${tenderTypeText.toLowerCase()} in 5 minutes instead of 20+ hours.</strong></p>
  
  <p>LuciusAI is the leading AI copilot for ${industryText.toLowerCase()} firms competing for ${tenderTypeText.toLowerCase()} in ${locationText}. Our GPT-4o powered platform generates compliant, professional proposals tailored to your industry.</p>
  
  <a href="https://www.ailucius.com/pricing" class="cta">Start Free Trial →</a>
  
  <div class="features">
    <div class="feature">
      <h3>📄 ${industryText}-Specific Templates</h3>
      <p>Pre-built templates optimized for ${industryText.toLowerCase()} ${tenderTypeText.toLowerCase()} in ${locationText}. Includes industry jargon, certifications, and compliance requirements.</p>
    </div>
    
    <div class="feature">
      <h3>🌍 ${locationText} Compliance</h3>
      <p>Automatically tailored for ${locationText} procurement regulations. GDPR compliant, EU tender formats, local language support.</p>
    </div>
    
    <div class="feature">
      <h3>⚡ 5-Minute Drafts</h3>
      <p>Upload your ${locationText} tender PDF, AI analyzes requirements, generates compliant draft. Save 95% of writing time.</p>
    </div>
    
    <div class="feature">
      <h3>💰 Pricing for ${industryText}</h3>
      <p>€99-€499/month. Much cheaper than hiring ${locationText}-based tender consultants (who charge €50K-200K).</p>
    </div>
  </div>
  
  <h2>How ${industryText} Firms Use LuciusAI in ${locationText}</h2>
  <ol>
    <li><strong>Upload ${locationText} Tender PDF:</strong> Drag and drop your ${tenderTypeText.toLowerCase()} document</li>
    <li><strong>AI Analyzes:</strong> Extracts requirements specific to ${industryText.toLowerCase()} and ${locationText} regulations</li>
    <li><strong>Generate Draft:</strong> Choose from Standard, Persuasive, or Technical templates</li>
    <li><strong>Customize:</strong> Add your ${industryText.toLowerCase()} case studies, team CVs, certifications</li>
    <li><strong>Submit:</strong> Download as Word/PDF, submit to ${locationText} procurement portal</li>
  </ol>
  
  <h2>Why ${industryText} Firms in ${locationText} Choose LuciusAI</h2>
  <ul>
    <li>✅ <strong>Industry Expertise:</strong> AI trained on winning ${industryText.toLowerCase()} proposals</li>
    <li>✅ <strong>Local Knowledge:</strong> Understands ${locationText} tender formats and evaluation criteria</li>
    <li>✅ <strong>Fast Turnaround:</strong> Critical for ${locationText} tenders with tight deadlines</li>
    <li>✅ <strong>Cost Effective:</strong> €199/month vs €50K+ for ${locationText} bid consultants</li>
  </ul>
  
  <a href="https://www.ailucius.com/pricing" class="cta">Try Free for 14 Days →</a>
  
  <hr style="margin: 40px 0;">
  
  <h3>Related Pages:</h3>
  <ul>
    <li><a href="/ai-tender-writing/government-tenders/${industry}/${location}">Government Tenders for ${industryText} in ${locationText}</a></li>
    <li><a href="/ai-tender-writing/${tenderType}/construction/${location}">Construction ${tenderTypeText} in ${locationText}</a></li>
    <li><a href="/ai-tender-writing/${tenderType}/${industry}/germany">AI Tender Writing for ${industryText} in Germany</a></li>
  </ul>
  
  <p style="margin-top: 40px; color: #666; font-size: 0.9rem;">
    LuciusAI | AI-Powered ${tenderTypeText} for ${industryText} | Serving ${locationText} | <a href="https://www.ailucius.com">www.ailucius.com</a>
  </p>
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
