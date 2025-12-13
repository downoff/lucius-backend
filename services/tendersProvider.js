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

const Parser = require("rss-parser");
const parser = new Parser();
const DEMO_RSS_URL = "https://www.contractsfinder.service.gov.uk/Search/RSS.xml";
const cachedTenders = {};
const lastFetch = {};
const CACHE_TTL = 3600000;


// ===== SUPPORTED REGIONS =====
const SupportedRegions = ["UK", "DACH", "FR", "EU-East", "US", "Middle-East"];


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
        console.error("Error fetching UK RSS feed:", error.message);
        console.warn("Falling back to stub data for UK.");
        // Fallback to stubs so the UI isn't empty
        return generateStubTenders("UK", 10);
    }
}

// ===== STUB FUNCTIONS REMOVED =====
function generateStubTenders(region, count = 5) {
    // STRICTLY REAL DATA REQUESTED
    // Returning empty array instead of stubs.
    return [];
}

// ... (rest of file)

// ===== MAIN FUNCTION: FETCH TENDERS BY REGION =====
async function fetchTendersByRegion(region = "UK") {
    if (!SupportedRegions.includes(region)) {
        console.warn(`Unsupported region: ${region}.`);
        return [];
    }

    // UK Data is now handled via the central DB ingestion (tenderIngestor.js)
    // accessible via the route/controller content, NOT this provider directly anymore.
    // But if preserved for legacy structure:
    if (region === "UK") {
        // Return empty here, because the ROUTE now merges DB data.
        // We don't want to duplicate or fetch from a possibly broken RSS here.
        // Real data is in the DB/Cache populated by tenderIngestor.
        return [];
    }

    // For other regions, no real data source is currently connected (RSS broken).
    // Returning empty array to satisfy "No Mock Data" rule.
    return [];
}

module.exports = {
    fetchRealTenders: async () => [], // Disabled here, handled in ingestor
    fetchTendersByRegion,
    SupportedRegions,
    generateStubTenders
};
