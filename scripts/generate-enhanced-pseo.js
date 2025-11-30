const path = require('path');
const fs = require('fs');

console.log('🚀 Generating Enhanced pSEO Pages - 5,000+ Pages');

// Enhanced page generation with cities, buyer types, and budget ranges

const TENDER_TYPES = [
    'government-tenders',
    'public-procurement',
    'rfp-response',
    'rfq-submission',
    'framework-agreements',
    'dynamic-purchasing',
    'public-contracts',
    'tender-opportunities',
    'bidding-process',
    'public-sector-contracts'
];

const INDUSTRIES = [
    'it-consulting', 'software-development', 'cloud-services', 'cybersecurity',
    'construction', 'civil-engineering', 'building-services', 'facilities-management',
    'healthcare', 'medical-equipment', 'pharmaceuticals', 'care-services',
    'education', 'training-services', 'e-learning', 'consultancy',
    'transport', 'logistics', 'fleet-management', 'infrastructure',
    'environmental', 'waste-management', 'energy-services', 'sustainability',
    'legal-services', 'financial-services', 'marketing', 'hr-services',
    'security-services', 'catering', 'cleaning', 'maintenance'
];

const COUNTRIES = [
    'uk', 'germany', 'france', 'spain', 'italy', 'netherlands', 'belgium',
    'poland', 'sweden', 'denmark', 'norway', 'finland', 'ireland', 'austria', 'portugal'
];

const MAJOR_CITIES = [
    // UK
    'london', 'manchester', 'Birmingham', 'leeds', 'glasgow', 'edinburgh', 'bristol',
    // Germany
    'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne',
    // France
    'paris', 'lyon', 'marseille', 'toulouse',
    // Spain
    'madrid', 'barcelona', 'valencia', 'seville',
    // Italy
    'rome', 'milan', 'naples', 'turin'
    // Add 20 more...
];

const BUYER_TYPES = [
    'central-government',
    'local-council',
    'health-authority',
    'universities',
    'defense-contracts',
    'police-services',
    'transport-authority'
];

const BUDGET_RANGES = [
    'under-50k',
    '50k-to-250k',
    '250k-to-1m',
    'over-1m'
];

function generateSEOPages() {
    console.log('\n📊 Generating pSEO Pages:\n');

    let totalPages = 0;
    const allPages = [];

    // Type 1: Country-level pages (existing)
    TENDER_TYPES.forEach(tenderType => {
        INDUSTRIES.forEach(industry => {
            COUNTRIES.forEach(country => {
                const url = `/ai-tender-writing/${tenderType}/${industry}/${country}`;
                allPages.push({
                    url,
                    type: 'country-level',
                    priority: 0.8,
                    changefreq: 'weekly',
                    title: `AI ${tenderType.replace(/-/g, ' ')} for ${industry.replace(/-/g, ' ')} in ${country.toUpperCase()}`,
                    keywords: [
                        `${industry} tender ${country}`,
                        `${tenderType} ${country}`,
                        `AI tender writing ${country}`
                    ]
                });
                totalPages++;
            });
        });
    });

    console.log(`✅ Country-level pages: ${totalPages}`);

    // Type 2: City-specific pages (NEW)
    let cityPages = 0;
    TENDER_TYPES.slice(0, 5).forEach(tenderType => { // Top 5 tender types
        INDUSTRIES.slice(0, 10).forEach(industry => { // Top 10 industries
            MAJOR_CITIES.forEach(city => {
                const url = `/ai-tender-writing/${tenderType}/${industry}/${city.toLowerCase()}`;
                allPages.push({
                    url,
                    type: 'city-level',
                    priority: 0.7,
                    changefreq: 'weekly',
                    title: `${industry.replace(/-/g, ' ')} Tenders in ${city}`,
                    keywords: [
                        `${industry} tender ${city}`,
                        `government contracts ${city}`,
                        `public procurement ${city}`
                    ]
                });
                cityPages++;
            });
        });
    });

    console.log(`✅ City-specific pages: ${cityPages}`);

    // Type 3: Buyer-type pages (NEW)
    let buyerPages = 0;
    BUYER_TYPES.forEach(buyerType => {
        INDUSTRIES.slice(0, 15).forEach(industry => {
            COUNTRIES.forEach(country => {
                const url = `/ai-tender-writing/${buyerType}/${industry}/${country}`;
                allPages.push({
                    url,
                    type: 'buyer-type',
                    priority: 0.75,
                    changefreq: 'weekly',
                    title: `${buyerType.replace(/-/g, ' ')} Tenders for ${industry.replace(/-/g, ' ')}`,
                    keywords: [
                        `${buyerType} procurement`,
                        `${buyerType} tender ${industry}`,
                        `${buyerType} contracts ${country}`
                    ]
                });
                buyerPages++;
            });
        });
    });

    console.log(`✅ Buyer-type pages: ${buyerPages}`);

    // Type 4: Budget-range pages (NEW)
    let budgetPages = 0;
    BUDGET_RANGES.forEach(budget => {
        INDUSTRIES.forEach(industry => {
            COUNTRIES.forEach(country => {
                const url = `/ai-tender-writing/${budget}-tenders/${industry}/${country}`;
                allPages.push({
                    url,
                    type: 'budget-range',
                    priority: 0.65,
                    changefreq: 'monthly',
                    title: `${budget.replace(/-/g, ' ')} ${industry.replace(/-/g, ' ')} Tenders`,
                    keywords: [
                        `${budget} tender`,
                        `small tender ${industry}`,
                        `large contract ${industry}`
                    ]
                });
                budgetPages++;
            });
        });
    });

    console.log(`✅ Budget-range pages: ${budgetPages}`);

    totalPages = allPages.length;

    console.log(`\n🎯 TOTAL PAGES GENERATED: ${totalPages}`);
    console.log(`\n📈 Expected Traffic:`);
    console.log(`   Month 3: ${Math.floor(totalPages * 0.05)} visitors/day`);
    console.log(`   Month 6: ${Math.floor(totalPages * 0.2)} visitors/day`);
    console.log(`   Month 12: ${Math.floor(totalPages * 0.8)} visitors/day`);
    console.log(`   Month 24: ${Math.floor(totalPages * 3)} visitors/day`);

    console.log(`\n💰 Revenue Potential (Month 24):`);
    const dailyVisitors = Math.floor(totalPages * 3);
    const monthlyVisitors = dailyVisitors * 30;
    const signups = Math.floor(monthlyVisitors * 0.05); // 5% conversion
    const paid = Math.floor(signups * 0.20); // 20% trial-to-paid
    const mrr = paid * 150; // €150 avg
    console.log(`   ${monthlyVisitors.toLocaleString()} monthly visitors`);
    console.log(`   ${signups.toLocaleString()} signups/month`);
    console.log(`   ${paid.toLocaleString()} new paying customers/month`);
    console.log(`   €${mrr.toLocaleString()} new MRR/month`);
    console.log(`   €${(mrr * 12).toLocaleString()} ARR potential`);

    // Generate sitemap XML
    generateSitemap(allPages);

    // Save page data for frontend rendering
    const outputPath = path.join(__dirname, '../data/pseo-pages.json');
    fs.writeFileSync(outputPath, JSON.stringify(allPages, null, 2));
    console.log(`\n✅ Page data saved to: ${outputPath}`);
}

function generateSitemap(pages) {
    let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    pages.forEach(page => {
        sitemapXML += `  <url>
    <loc>https://luciusai.com${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    });

    sitemapXML += `</urlset>`;

    const sitemapPath = path.join(__dirname, '../public/sitemap-all.xml');
    fs.writeFileSync(sitemapPath, sitemapXML);
    console.log(`\n✅ Sitemap generated: ${sitemapPath}`);
}

// Run generation
generateSEOPages();
