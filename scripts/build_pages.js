const fs = require('fs');
const path = require('path');

// Configuration
const MATRIX_FILE = path.join(__dirname, '../data/seo_matrix.json');
const TEMPLATE_FILE = path.join(__dirname, '../templates/seo_template.html');
// CI/CD friendly: Use env var or default to relative frontend path, or fallback to local public folder
const DEFAULT_FRONTEND = path.join(__dirname, '../../lucius-frontend-1/public/tenders');
const DIST_DIR = process.env.OUTPUT_DIR || (fs.existsSync(path.dirname(DEFAULT_FRONTEND)) ? DEFAULT_FRONTEND : path.join(__dirname, '../public/tenders'));

async function buildPages() {
  console.log("🚀 Starting Static Page Generation...");

  try {
    if (!fs.existsSync(MATRIX_FILE)) {
      throw new Error(`Matrix file not found: ${MATRIX_FILE}. Run generate_matrix.js first.`);
    }

    const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));
    const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

    // Ensure Dist Dir
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    console.log(`Processing ${matrix.length} pages...`);

    // Helper to generate related links (random 5 from matrix)
    const generateRelatedLinks = (currentSlug) => {
      const others = matrix.filter(item => item.slug !== currentSlug)
        .sort(() => 0.5 - Math.random())
        .slice(0, 6);

      return others.map(item =>
        `<a href="/tenders/${item.slug}.html" class="text-slate-600 hover:text-indigo-600 block py-1">
                    ${item.industry} in ${item.location}
                 </a>`
      ).join('\n');
    };

    let count = 0;
    for (const item of matrix) {
      let html = template;

      // Replacements
      // We use a simple regex replace for all keys
      // Keywords are an array, so we handle them specifically
      const k1 = item.keywords[0] || "Compliance";
      const k2 = item.keywords[1] || "Regulation";
      const k3 = item.keywords[2] || "Standards";

      html = html.replace(/{{Industry}}/g, item.industry || "General");
      html = html.replace(/{{Location}}/g, item.location || "Global");
      html = html.replace(/{{Pain_Points}}/g, item.pain_points || "manual paperwork");
      html = html.replace(/{{Content_Hook}}/g, item.content_hook || "Check your compliance instantly.");

      html = html.replace(/{{Keyword_1}}/g, k1);
      html = html.replace(/{{Keyword_2}}/g, k2);
      html = html.replace(/{{Keyword_3}}/g, k3);

      // Related Links
      const links = generateRelatedLinks(item.slug);
      html = html.replace(/{{Related_Links}}/g, links);

      // Write File
      const filename = `${item.slug}.html`; // Physical file
      fs.writeFileSync(path.join(DIST_DIR, filename), html);
      count++;
    }

    console.log(`✅ Successfully generated ${count} static HTML pages in ${DIST_DIR}`);

  } catch (error) {
    console.error("❌ Build Failed:", error);
  }
}

buildPages();
