const { calculateMatchScore } = require("./scoring");

// ===== DEMO PROFILE FOR SCORING =====
// In a real app, this would come from the user's authenticated company profile.
const DEMO_COMPANY = {
    company_name: "TechSolutions Ltd",
    keywords_include: ["software development", "cloud migration", "cybersecurity", "digital transformation", "AI", "data analytics"],
    keywords_exclude: ["construction", "cleaning", "catering", "hardware supply"],
    cpv_codes: ["72000000-5", "72200000-7"],
    description: "A leading IT consultancy specializing in digital transformation, cloud infrastructure, and custom software development for the public sector."
};

// ... (rest of imports)

// ===== UK REAL TENDER DATA =====
async function fetchRealTenders() {
    const region = "UK";
    const now = Date.now();

    if (cachedTenders[region]?.length > 0 && now - (lastFetch[region] || 0) < CACHE_TTL) {
        return cachedTenders[region];
    }

    try {
        const feed = await parser.parseURL(DEMO_RSS_URL);

        // Process tenders in parallel for scoring
        const normalizedPromises = feed.items.slice(0, 10).map(async (item) => {
            const budgetMatch = item.content?.match(/£[\d,]+(\.\d{2})?/);
            const budget = budgetMatch ? budgetMatch[0] : "See tender docs";

            // AI Scoring
            const aiResult = await calculateMatchScore({
                title: item.title,
                description_raw: item.contentSnippet,
                budget,
                region: "UK"
            }, DEMO_COMPANY);

            return {
                _id: item.guid || item.link,
                title: item.title,
                short_description: (item.contentSnippet || "").substring(0, 200) + "...",
                description_raw: item.content || item.contentSnippet,
                country: "UK",
                region: "UK",
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                budget: budget,
                match_score: aiResult.score,
                rationale: aiResult.rationale, // New field
                source_url: item.link,
                is_real: true
            };
        });

        const normalized = await Promise.all(normalizedPromises);

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
    // ... (keep existing stub data)
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

        // Simulate AI score for stubs (weighted towards high for demo)
        const isHighFit = Math.random() > 0.3;
        const score = isHighFit ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 30) + 50;

        tenders.push({
            _id: `stub-${region}-${Date.now()}-${i}`,
            title: randomTitle,
            short_description: "This is a high-value opportunity matching your company profile. Click to view full details and AI analysis.",
            description_raw: "Full tender description would appear here...",
            country: randomCountry,
            region: region,
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            budget: budget,
            match_score: score,
            rationale: isHighFit ? "Strong match with core capabilities in digital transformation." : "Partial match - requires partner for infrastructure components.",
            source_url: "#",
            is_real: false
        });
    }

    return tenders;
}

// ... (rest of file)

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
