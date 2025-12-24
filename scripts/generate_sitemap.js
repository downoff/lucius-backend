const fs = require('fs');
const path = require('path');

// Configuration
const MATRIX_FILE = path.join(__dirname, '../data/seo_matrix.json');
const SITEMAP_FILE = path.join(__dirname, '../../lucius-frontend-1/public/sitemap.xml');
const BASE_URL = 'https://www.ailucius.com'; // User's domain from previous context (or standard placeholder)

async function generateSitemap() {
  console.log("🚀 Generating Sitemap...");

  try {
    if (!fs.existsSync(MATRIX_FILE)) {
      throw new Error(`Matrix file not found: ${MATRIX_FILE}`);
    }

    const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add Main Static Pages
    const mainPages = ['', 'pricing', 'onboarding', 'login'];
    mainPages.forEach(p => {
      sitemap += `  <url>
    <loc>${BASE_URL}/${p}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;
    });

    // Add PSEO Pages
    matrix.forEach(item => {
      sitemap += `  <url>
    <loc>${BASE_URL}/tenders/${item.slug}.html</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    sitemap += `</urlset>`;

    fs.writeFileSync(SITEMAP_FILE, sitemap);
    console.log(`✅ Generated sitemap with ${matrix.length + mainPages.length} URLs at ${SITEMAP_FILE}`);

  } catch (error) {
    console.error("❌ Sitemap Generation Failed:", error);
  }
}

generateSitemap();
