const fs = require('fs');
const path = require('path');

// Configuration: Target 1,000+ Permutations
const INDUSTRIES = [
  'Construction', 'Software', 'Healthcare', 'Logistics',
  'Consulting', 'Education', 'Security', 'Cleaning',
  'Engineering', 'Marketing'
];

const LOCATIONS = [
  'London', 'Manchester', 'New-York', 'Berlin',
  'Paris', 'Dubai', 'Sydney', 'Toronto',
  'Singapore', 'California', 'Texas', 'Florida'
];

const TENDER_TYPES = [
  'tender-writing', 'bid-management', 'proposal-software', 'rfp-automation'
];

const BASE_URL = 'https://www.ailucius.com';

function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // 1. Static Core Pages
  const staticPages = [
    '', '/pricing', '/how-it-works', '/contact', '/login', '/blog'
  ];

  staticPages.forEach(p => {
    xml += `
    <url>
        <loc>${BASE_URL}${p}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${p === '' ? '1.0' : '0.8'}</priority>
    </url>`;
  });

  // 2. Programmatic SEO Pages (The Growth Engine)
  // /ai-tender-writing/{industry}/{location}
  let count = 0;
  TENDER_TYPES.forEach(type => {
    INDUSTRIES.forEach(ind => {
      LOCATIONS.forEach(loc => {
        const slug = `/ai-tender-writing/${type}/${ind.toLowerCase()}/${loc.toLowerCase()}`;
        xml += `
    <url>
        <loc>${BASE_URL}${slug}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
        count++;
      });
    });
  });

  xml += `
</urlset>`;

  console.log(`Generated Sitemap with ${count + staticPages.length} URLs.`);

  // Write to Frontend Public Dir
  const outputPath = path.resolve(__dirname, '../../lucius-frontend-1/public/sitemap.xml');
  fs.writeFileSync(outputPath, xml);
  console.log(`Wrote to: ${outputPath}`);
}

generateSitemap();
