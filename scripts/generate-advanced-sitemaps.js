const fs = require('fs');
const path = require('path');

console.log('🗺️  Generating Advanced SEO Sitemap System\n');

// All tender types, industries, and locations
const TENDER_TYPES = [
    'government-tenders', 'public-procurement', 'rfp-response', 'rfq-submission',
    'framework-agreements', 'dynamic-purchasing', 'public-contracts', 'tender-opportunities',
    'bidding-process', 'public-sector-contracts'
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
    'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'edinburgh',
    'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne',
    'paris', 'lyon', 'marseille', 'toulouse',
    'madrid', 'barcelona', 'valencia', 'seville',
    'rome', 'milan', 'naples', 'turin'
];

// Priority weighting for better SEO
function calculatePriority(type, industry, location) {
    let priority = 0.5; // Base priority

    // High-value industries
    const highValueIndustries = ['it-consulting', 'software-development', 'construction', 'healthcare'];
    if (highValueIndustries.includes(industry)) priority += 0.1;

    // Major markets
    const majorMarkets = ['uk', 'germany', 'france'];
    if (majorMarkets.includes(location)) priority += 0.1;

    // Top tender types
    const topTypes = ['government-tenders', 'public-procurement', 'rfp-response'];
    if (topTypes.includes(type)) priority += 0.1;

    // Cities get slightly lower priority than countries
    if (MAJOR_CITIES.includes(location)) priority -= 0.05;

    return Math.min(priority, 1.0).toFixed(2);
}

// Change frequency based on content type
function getChangeFreq(type) {
    if (type === 'page') return 'weekly'; // pSEO pages update weekly with new tender data
    if (type === 'blog') return 'monthly'; // Blog posts are static
    if (type === 'tool') return 'monthly'; // Tools change rarely
    return 'weekly';
}

// Generate main sitemap index
function generateSitemapIndex() {
    console.log('📋 Generating sitemap index...\n');

    const sitemaps = [
        { name: 'sitemap-uk.xml', lastmod: new Date().toISOString() },
        { name: 'sitemap-eu.xml', lastmod: new Date().toISOString() },
        { name: 'sitemap-cities.xml', lastmod: new Date().toISOString() },
        { name: 'sitemap-blog.xml', lastmod: new Date().toISOString() },
        { name: 'sitemap-tools.xml', lastmod: new Date().toISOString() },
        { name: 'sitemap-core.xml', lastmod: new Date().toISOString() }
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    sitemaps.forEach(sitemap => {
        xml += '  <sitemap>\n';
        xml += `    <loc>https://luciusai.com/${sitemap.name}</loc>\n`;
        xml += `    <lastmod>${sitemap.lastmod.split('T')[0]}</lastmod>\n`;
        xml += '  </sitemap>\n';
    });

    xml += '</sitemapindex>';

    return xml;
}

// Generate URL entry with advanced options
function generateUrlEntry(url, priority, changefreq, lastmod, images = []) {
    let entry = '  <url>\n';
    entry += `    <loc>https://luciusai.com${url}</loc>\n`;
    entry += `    <lastmod>${lastmod}</lastmod>\n`;
    entry += `    <changefreq>${changefreq}</changefreq>\n`;
    entry += `    <priority>${priority}</priority>\n`;

    // Add image tags if provided
    images.forEach(img => {
        entry += '    <image:image>\n';
        entry += `      <image:loc>https://luciusai.com${img.loc}</image:loc>\n`;
        if (img.title) entry += `      <image:title>${img.title}</image:title>\n`;
        if (img.caption) entry += `      <image:caption>${img.caption}</image:caption>\n`;
        entry += '    </image:image>\n';
    });

    entry += '  </url>\n';
    return entry;
}

// Generate UK-specific sitemap
function generateUKSitemap() {
    console.log('🇬🇧 Generating UK sitemap...');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    let count = 0;
    TENDER_TYPES.forEach(type => {
        INDUSTRIES.forEach(industry => {
            const url = `/ai-tender-writing/${type}/${industry}/uk`;
            const priority = calculatePriority(type, industry, 'uk');
            const changefreq = getChangeFreq('page');
            const lastmod = new Date().toISOString().split('T')[0];

            xml += generateUrlEntry(url, priority, changefreq, lastmod);
            count++;
        });
    });

    xml += '</urlset>';

    console.log(`   ✓ ${count} UK pages\n`);
    return xml;
}

// Generate EU (non-UK) sitemap
function generateEUSitemap() {
    console.log('🇪🇺 Generating EU sitemap...');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    let count = 0;
    const euCountries = COUNTRIES.filter(c => c !== 'uk');

    TENDER_TYPES.forEach(type => {
        INDUSTRIES.forEach(industry => {
            euCountries.forEach(country => {
                const url = `/ai-tender-writing/${type}/${industry}/${country}`;
                const priority = calculatePriority(type, industry, country);
                const changefreq = getChangeFreq('page');
                const lastmod = new Date().toISOString().split('T')[0];

                xml += generateUrlEntry(url, priority, changefreq, lastmod);
                count++;
            });
        });
    });

    xml += '</urlset>';

    console.log(`   ✓ ${count} EU pages\n`);
    return xml;
}

// Generate city-specific sitemap
function generateCitiesSitemap() {
    console.log('🏙️  Generating cities sitemap...');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    let count = 0;
    // Top tender types and industries only for cities (to keep count reasonable)
    const topTypes = TENDER_TYPES.slice(0, 5);
    const topIndustries = INDUSTRIES.slice(0, 15);

    topTypes.forEach(type => {
        topIndustries.forEach(industry => {
            MAJOR_CITIES.forEach(city => {
                const url = `/ai-tender-writing/${type}/${industry}/${city}`;
                const priority = calculatePriority(type, industry, city);
                const changefreq = getChangeFreq('page');
                const lastmod = new Date().toISOString().split('T')[0];

                xml += generateUrlEntry(url, priority, changefreq, lastmod);
                count++;
            });
        });
    });

    xml += '</urlset>';

    console.log(`   ✓ ${count} city pages\n`);
    return xml;
}

// Generate core pages sitemap
function generateCoreSitemap() {
    console.log('⭐ Generating core pages sitemap...');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    const corePages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/pricing', priority: '1.0', changefreq: 'weekly' },
        { url: '/how-it-works', priority: '0.9', changefreq: 'weekly' },
        { url: '/tender-ai', priority: '0.9', changefreq: 'weekly' },
        { url: '/tools/win-calculator', priority: '0.9', changefreq: 'monthly' },
        { url: '/templates', priority: '0.8', changefreq: 'weekly' },
        { url: '/blog', priority: '0.8', changefreq: 'daily' },
        { url: '/resources', priority: '0.7', changefreq: 'weekly' },
        { url: '/investors', priority: '0.7', changefreq: 'monthly' },
        { url: '/about', priority: '0.6', changefreq: 'monthly' }
    ];

    const lastmod = new Date().toISOString().split('T')[0];

    corePages.forEach(page => {
        xml += generateUrlEntry(page.url, page.priority, page.changefreq, lastmod);
    });

    xml += '</urlset>';

    console.log(`   ✓ ${corePages.length} core pages\n`);
    return xml;
}

// Generate blog sitemap
function generateBlogSitemap() {
    console.log('📝 Generating blog sitemap...');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';

    // Placeholder for blog posts (will be populated by auto-blog system)
    const sampleBlogPosts = [
        '/blog/how-to-win-government-tenders',
        '/blog/ai-tender-writing-guide',
        '/blog/government-procurement-tips',
        '/blog/tender-success-stories'
    ];

    const lastmod = new Date().toISOString().split('T')[0];

    sampleBlogPosts.forEach(post => {
        xml += generateUrlEntry(post, '0.7', 'monthly', lastmod);
    });

    xml += '</urlset>';

    console.log(`   ✓ ${sampleBlogPosts.length} blog posts\n`);
    return xml;
}

// Generate tools sitemap
function generateToolsSitemap() {
    console.log('🛠️  Generating tools sitemap...');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    const tools = [
        '/tools/win-calculator',
        '/tools/tender-budget-calculator',
        '/tools/roi-calculator',
        '/automation'
    ];

    const lastmod = new Date().toISOString().split('T')[0];

    tools.forEach(tool => {
        xml += generateUrlEntry(tool, '0.8', 'monthly', lastmod);
    });

    xml += '</urlset>';

    console.log(`   ✓ ${tools.length} tools\n`);
    return xml;
}

// Main execution
function generateAllSitemaps() {
    console.log('═'.repeat(60));
    console.log('ADVANCED SITEMAP GENERATION');
    console.log('═'.repeat(60));
    console.log('\n');

    const outputDir = path.join(__dirname, '../public');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate all sitemaps
    const sitemaps = {
        'sitemap.xml': generateSitemapIndex(),
        'sitemap-uk.xml': generateUKSitemap(),
        'sitemap-eu.xml': generateEUSitemap(),
        'sitemap-cities.xml': generateCitiesSitemap(),
        'sitemap-core.xml': generateCoreSitemap(),
        'sitemap-blog.xml': generateBlogSitemap(),
        'sitemap-tools.xml': generateToolsSitemap()
    };

    // Write all sitemaps to disk
    Object.entries(sitemaps).forEach(([filename, content]) => {
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, content);
        console.log(`✅ Saved: ${filename}`);
    });

    // Calculate totals
    const ukCount = TENDER_TYPES.length * INDUSTRIES.length;
    const euCount = TENDER_TYPES.length * INDUSTRIES.length * (COUNTRIES.length - 1);
    const citiesCount = 5 * 15 * MAJOR_CITIES.length; // Top 5 types, 15 industries
    const totalPages = ukCount + euCount + citiesCount + 10 + 4 + 4;

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 SITEMAP SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total URLs: ${totalPages.toLocaleString()}`);
    console.log(`UK pages: ${ukCount.toLocaleString()}`);
    console.log(`EU pages: ${euCount.toLocaleString()}`);
    console.log(`City pages: ${citiesCount.toLocaleString()}`);
    console.log(`Core pages: 10`);
    console.log(`Blog posts: 4`);
    console.log(`Tools: 4`);
    console.log('\n');
    console.log('🎯 SEO OPTIMIZATION:');
    console.log('   ✓ Segmented sitemaps (faster crawling)');
    console.log('   ✓ Priority weighting (important pages ranked higher)');
    console.log('   ✓ Change frequency optimization');
    console.log('   ✓ Last-modified dates');
    console.log('   ✓ Image sitemap support');
    console.log('\n');
    console.log('📈 EXPECTED RANKING BOOST:');
    console.log('   • Faster indexing (segmented sitemaps)');
    console.log('   • Better crawl budget usage');
    console.log('   • Priority signals to Google');
    console.log('   • Fresh content indicators');
    console.log('\n');
    console.log('🚀 NEXT STEPS:');
    console.log('   1. Deploy sitemaps to production');
    console.log('   2. Submit sitemap.xml to Google Search Console');
    console.log('   3. Submit to Bing Webmaster Tools');
    console.log('   4. Monitor indexing progress');
    console.log('\n');
    console.log('═'.repeat(60));
}

// Run generation
generateAllSitemaps();
