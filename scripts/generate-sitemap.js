const fs = require('fs');
const path = require('path');

// Dynamic Sitemap Generator for 1,260 pSEO Pages
const DOMAIN = 'https://www.ailucius.com'; // Update with your actual domain

const industries = [
    'it-consulting', 'cloud-services', 'cybersecurity', 'software-development',
    'construction', 'healthcare', 'education', 'transportation', 'energy'
];

const locations = [
    'uk', 'germany', 'france', 'spain', 'netherlands', 'italy',
    'belgium', 'austria', 'denmark', 'sweden', 'poland', 'ireland',
    'portugal', 'czech-republic'
];

const tenderTypes = [
    'government-tenders', 'public-procurement', 'framework-agreements',
    'dynamic-purchasing-systems', 'innovation-partnerships',
    'public-private-partnerships', 'grant-opportunities',
    'eu-tenders', 'local-authority-contracts', 'central-government-contracts'
];

// Static pages
const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/pricing', changefreq: 'weekly', priority: '0.9' },
    { url: '/how-it-works', changefreq: 'weekly', priority: '0.9' },
    { url: '/tender-ai', changefreq: 'weekly', priority: '0.9' },
    { url: '/tenders', changefreq: 'daily', priority: '0.8' },
    { url: '/tools/win-calculator', changefreq: 'monthly', priority: '0.8' },
    { url: '/investors', changefreq: 'monthly', priority: '0.7' },
    { url: '/blog', changefreq: 'weekly', priority: '0.7' },
    { url: '/resources', changefreq: 'weekly', priority: '0.7' },
    { url: '/onboarding', changefreq: 'monthly', priority: '0.6' },
];

function generateSitemap() {
    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    staticPages.forEach(page => {
        xml += `  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    });

    // Add all pSEO combinations (1,260 pages)
    let count = 0;
    tenderTypes.forEach(tenderType => {
        industries.forEach(industry => {
            locations.forEach(location => {
                xml += `  <url>
    <loc>${DOMAIN}/ai-tender-writing/${tenderType}/${industry}/${location}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
                count++;
            });
        });
    });

    xml += `</urlset>`;

    console.log(`✅ Sitemap generated with ${staticPages.length + count} URLs`);
    console.log(`   - ${staticPages.length} static pages`);
    console.log(`   - ${count} pSEO pages`);

    // Write to current directory (can be copied to frontend public folder)
    const outputPath = path.join(__dirname, 'sitemap.xml');
    fs.writeFileSync(outputPath, xml, 'utf8');
    console.log(`📄 Saved to: ${outputPath}`);
    console.log(`\n📋 Copy this file to your frontend's public folder before deployment.`);
}

generateSitemap();
