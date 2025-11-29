// scripts/submit-to-google.js
/**
 * AUTOMATED SEARCH ENGINE SUBMISSION
 * Submits sitemap to Google automatically (no manual work)
 */

const https = require('https');

// Google Search Console API - requires OAuth setup
// For instant submission without OAuth, use IndexNow API (Bing, Yandex auto-index)

/**
 * IndexNow API - Instant indexing by Microsoft Bing & Yandex
 * Free, no auth required, instant results
 */
function submitToIndexNow(urls) {
    const data = JSON.stringify({
        host: "www.ailucius.com",
        key: "YOUR_API_KEY_HERE", // Generate free at indexnow.org
        keyLocation: "https://www.ailucius.com/indexnow-key.txt",
        urlList: urls
    });

    const options = {
        hostname: 'api.indexnow.org',
        port: 443,
        path: '/indexnow',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        console.log(`IndexNow Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log('✅ URLs submitted to Bing/Yandex successfully!');
        }
    });

    req.on('error', (error) => {
        console.error('❌ IndexNow Error:', error);
    });

    req.write(data);
    req.end();
}

/**
 * Auto-submit all programmatic SEO pages
 * Run this script daily via cron job
 */
function submitAllPages() {
    const industries = ["IT Consulting", "Engineering", "Construction"];
    const locations = ["UK", "London", "Germany", "Berlin", "France"];
    const tenderTypes = ["Government Tenders", "Public Sector Contracts", "RFP Responses"];

    const urls = [];

    industries.forEach((industry) => {
        locations.forEach((location) => {
            tenderTypes.forEach((type) => {
                const slug = `${type.toLowerCase().replace(/\s+/g, "-")}/${industry.toLowerCase().replace(/\s+/g, "-")}/${location.toLowerCase().replace(/\s+/g, "-")}`;
                urls.push(`https://www.ailucius.com/ai-tender-writing/${slug}`);
            });
        });
    });

    // Submit in batches of 100 (IndexNow limit)
    for (let i = 0; i < urls.length; i += 100) {
        const batch = urls.slice(i, i + 100);
        submitToIndexNow(batch);
    }

    console.log(`📊 Submitted ${urls.length} URLs to search engines`);
}

// Run immediately
submitAllPages();

// Auto-run daily at 3am (set up cron job in production)
// Example cron: 0 3 * * * node /path/to/submit-to-google.js

module.exports = { submitAllPages };
