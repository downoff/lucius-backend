const Parser = require('rss-parser');
const parser = new Parser();

// ===== SUPPORTED REGIONS =====
const SupportedRegions = ["UK", "DACH", "FR", "EU-East", "US", "Middle-East"];

// UK Contracts Finder RSS Feed
const RSS_URL = "https://www.contractsfinder.service.gov.uk/Search/RSS.xml?regions=1&regions=2&regions=3&cat=12&cat=13&cat=14";
const DEMO_RSS_URL = "https://www.contractsfinder.service.gov.uk/Search/RSS.xml?cat=12&cat=13&cat=14";

let cachedTenders = {};
let lastFetch = {};
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

// ===== UK REAL TENDER DATA =====
async function fetchRealTenders() {
    const region = "UK";
    const now = Date.now();

    if (cachedTenders[region]?.length > 0 && now - (lastFetch[region] || 0) < CACHE_TTL) {
        return cachedTenders[region];
    }

    try {
        const feed = await parser.parseURL(DEMO_RSS_URL);
        const normalized = feed.items.map(item => {
            const budgetMatch = item.content?.match(/£[\d,]+(\.\d{2})?/);
            const budget = budgetMatch ? budgetMatch[0] : "See tender docs";

            return {
                _id: item.guid || item.link,
                title: item.title,
                short_description: (item.contentSnippet || "").substring(0, 200) + "...",
                description_raw: item.content || item.contentSnippet,
                country: "UK",
                region: "UK",
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                budget: budget,
                match_score: Math.floor(Math.random() * 30) + 70,
                source_url: item.link,
                is_real: true
            };
        });

        cachedTenders[region] = normalized;
        lastFetch[region] = now;
        return normalized;
    } catch (error) {
        console.error("Error fetching UK RSS feed:", error);
        return [];
    }
}

// ===== STUB FUNCTIONS FOR OTHER REGIONS =====
function generateStubTenders(region, count = 5) {
    const regionData = {
        "DACH": {
            countries: ["Germany", "Austria", "Switzerland"],
            budgetCurrency: "€",
            sampleTitles: [
                "IT Infrastructure Modernization - Federal Ministry",
                "Cloud Migration Services - Munich City",
                "Cybersecurity Consulting - Austrian Government",
                "Digital Transformation Project - Zurich Canton",
                "ERP System Implementation - Berlin Municipality"
            ]
        },
        "FR": {
            countries: ["France"],
            budgetCurrency: "€",
            sampleTitles: [
                "Digital Services Framework - Ministry of Interior",
                "Cloud Computing Services - Paris City Hall",
                "IT Support Services - Lyon Metropolitan Area",
                "Software Development - French Government Agency",
                "Data Center Upgrade - Marseille City"
            ]
        },
        "EU-East": {
            countries: ["Poland", "Czech Republic", "Romania", "Hungary"],
            budgetCurrency: "€",
            sampleTitles: [
                "IT Services - Warsaw City Government",
                "Digital Infrastructure - Prague Municipality",
                "Cloud Services - Bucharest City Hall",
                "Software Licensing - Budapest Government",
                "Network Upgrade - Krakow City"
            ]
        },
        "US": {
            countries: ["United States"],
            budgetCurrency: "$",
            sampleTitles: [
                "IT Modernization - Department of Veterans Affairs",
                "Cybersecurity Services - GSA Schedule",
                "Cloud Services - Department of Defense",
                "Software Development - State of California",
                "Data Analytics Platform - City of New York"
            ]
        },
        "Middle-East": {
            countries: ["UAE", "Saudi Arabia", "Qatar"],
            budgetCurrency: "$",
            sampleTitles: [
                "Smart City Project - Dubai",
                "Digital Transformation - Riyadh",
                "IT Infrastructure - Doha",
                "Cloud Services - Abu Dhabi",
                "Cybersecurity Audit - Jeddah"
            ]
        }
    };

    const data = regionData[region] || regionData["EU-East"];
    const tenders = [];

    for (let i = 0; i < count; i++) {
        const randomTitle = data.sampleTitles[Math.floor(Math.random() * data.sampleTitles.length)];
        const randomCountry = data.countries[Math.floor(Math.random() * data.countries.length)];
        const budget = `${data.budgetCurrency}${(Math.floor(Math.random() * 500) + 50)}k`;

        tenders.push({
            _id: `stub-${region}-${Date.now()}-${i}`,
            title: randomTitle,
            short_description: "This is a high-value opportunity matching your company profile. Click to view full details and AI analysis.",
            description_raw: "Full tender description would appear here...",
            country: randomCountry,
            region: region,
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            budget: budget,
            match_score: Math.floor(Math.random() * 30) + 70,
            source_url: "#",
            is_real: false
        });
    }

    return tenders;
}

// ===== MAIN FUNCTION: FETCH TENDERS BY REGION =====
async function fetchTendersByRegion(region = "UK") {
    if (!SupportedRegions.includes(region)) {
        console.warn(`Unsupported region: ${region}. Falling back to UK.`);
        region = "UK";
    }

    if (region === "UK") {
        return await fetchRealTenders();
    }

    const now = Date.now();
    if (cachedTenders[region]?.length > 0 && now - (lastFetch[region] || 0) < CACHE_TTL) {
        return cachedTenders[region];
    }

    const stubTenders = generateStubTenders(region, 5);
    cachedTenders[region] = stubTenders;
    lastFetch[region] = now;

    return stubTenders;
}

module.exports = {
    fetchRealTenders,
    fetchTendersByRegion,
    SupportedRegions,
    generateStubTenders
};
