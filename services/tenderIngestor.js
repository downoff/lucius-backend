const Parser = require("rss-parser");
const mongoose = require("mongoose");
const Tender = require("../models/Tender");
const { calculateMatchScore } = require("./scoring");

// Ensure environment variables are loaded
// Ensure environment variables are loaded
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const TENDERS_FILE = path.join(DATA_DIR, "tenders.json");

const parser = new Parser({
  // Add timeout to parser request
  timeout: 10000,
  headers: {
    'User-Agent': 'LuciusAI/1.0 (Public Tender Aggregator)'
  }
});

// Demo Company Profile for scoring (if no real company match logic in ingestor)
const DEMO_COMPANY = {
  company_name: "LuciusAI Generic",
  keywords_include: ["software", "digital", "platform", "cloud", "data", "cybersecurity"],
  keywords_exclude: ["construction", "cleaning", "school meals"]
};

/**
 * Validate required environment variables and return config.
 * Throws error if critical env vars are missing.
 */
function getIngestionConfig() {
  const config = {
    TED_RSS_URLS: [
      // Broad sectors to get "Global" (EU + GPA) coverage
      "https://ted.europa.eu/en/rss/search?q=sector:services",
      "https://ted.europa.eu/en/rss/search?q=sector:works",
      "https://ted.europa.eu/en/rss/search?q=sector:supplies",
      // Specific high-value keywords for broader reach
      "https://ted.europa.eu/en/rss/search?q=AI OR artificial intelligence",
      "https://ted.europa.eu/en/rss/search?q=software OR digital OR platform"
    ],
    UK_CONTRACTS_FINDER_URL: process.env.UK_CONTRACTS_FINDER_URL || "https://www.contractsfinder.service.gov.uk/Published/Feed/Atom",
    MONGO_URI: process.env.MONGO_URI
  };

  // Log configuration status
  if (!config.MONGO_URI) {
    console.error("❌ MISSING ENV: MONGO_URI");
  } else {
    // console.log("✅ ENV: MONGO_URI is set");
  }

  // Check UK URL
  if (!process.env.UK_CONTRACTS_FINDER_URL) {
    console.log("ℹ️ ENV: UK_CONTRACTS_FINDER_URL not set, using default: " + config.UK_CONTRACTS_FINDER_URL);
  } else {
    console.log("✅ ENV: UK_CONTRACTS_FINDER_URL is set");
  }

  // Override TED if provided (comma separate)
  if (process.env.TED_RSS_URL) {
    config.TED_RSS_URLS = process.env.TED_RSS_URL.split(',').map(s => s.trim());
    console.log("✅ ENV: TED_RSS_URL override used");
  }

  return config;
}

const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in Node 18+

// ... imports remain the same

async function ingestFromTED() {
  const config = getIngestionConfig();

  // Stats tracking
  let stats = { processed: 0, new: 0, errors: 0 };

  console.log("🚀 [Ingest] Starting Real Tender Ingestion...");

  // 1. Ingest from UK Contracts Finder (OCDS API)
  // This provides REAL, live data from the UK government
  try {
    const ukUrl = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=30";
    console.log(`📡 [UK-API] Fetching real tenders from: ${ukUrl}`);

    // Use native fetch (Node 18+) or fallback
    const response = await (global.fetch || fetch)(ukUrl);

    if (!response.ok) {
      throw new Error(`UK API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [UK-API] Received ${data.results?.length || 0} notices`);

    if (data.results) {
      for (const notice of data.results) {
        try {
          // OCDS Format Handling
          // Releases is an array, take the latest
          const latestRelease = notice.releases?.[0]; // Usually just one in search results
          if (!latestRelease) continue;

          const tenderInfo = latestRelease.tender || {};
          const buyer = latestRelease.buyer || {};

          const tenderObj = {
            title: tenderInfo.title || "Untitled Tender",
            description_raw: tenderInfo.description || "",
            authority: buyer.name || "Public Authority",
            country: "UK", // It's the UK feed
            deadline: tenderInfo.tenderPeriod?.endDate ? new Date(tenderInfo.tenderPeriod.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            url: latestRelease.id ? `https://www.contractsfinder.service.gov.uk/Notice/${latestRelease.id}` : "", // Construct URL
            published_at: latestRelease.date ? new Date(latestRelease.date) : new Date(),
            budget: tenderInfo.value?.amount ? `£${tenderInfo.value.amount.toLocaleString()}` : "N/A"
          };

          // Generate score
          const aiResult = await calculateMatchScore({
            title: tenderObj.title,
            description_raw: tenderObj.description_raw,
            budget: tenderObj.budget
          }, DEMO_COMPANY);

          // Save to Mock Cache/DB equivalent
          const finalTender = {
            ...tenderObj,
            _id: "uk_" + (latestRelease.id || Math.random().toString(36).substr(2, 9)),
            match_score: aiResult.score,
            rationale: aiResult.rationale,
            source: "UK-Official"
          };

          // Update generic cache
          await addToCache(finalTender);
          stats.new++;
          stats.processed++;

        } catch (err) {
          console.error("Error processing UK tender:", err.message);
          stats.errors++;
        }
      }
    }

  } catch (err) {
    console.error("❌ [UK-API] Failed:", err.message);
    stats.errors++;
  }

  // 2. Mock Data Fallback (for demo variety if UK fails or is filtered)
  // We keep this to ensure the "Pitch Deck" always has "International" looking data
  // But we label it clearly if we must.
  // Actually, let's rely on the mockTenderData service we created earlier as a backup in the ROUTE,
  // not here in the ingestor. The ingestor should focus on REAL data.

  console.log(`🎉 Ingestion Finished. Stats:`, stats);
}

// Helper to save to file cache (mimicking DB for now to be safe/fast)
async function addToCache(tender) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let currentCache = [];
  try {
    if (fs.existsSync(TENDERS_FILE)) {
      currentCache = JSON.parse(fs.readFileSync(TENDERS_FILE, "utf-8"));
    }
  } catch (e) { }

  // Dedup
  const exists = currentCache.find(t => t.title === tender.title || t.url === tender.url);
  if (!exists) {
    currentCache.unshift(tender);
    // Keep file size manageable
    if (currentCache.length > 200) currentCache = currentCache.slice(0, 200);
    fs.writeFileSync(TENDERS_FILE, JSON.stringify(currentCache, null, 2));

    // Update memory cache immediately
    global.latestTendersCache = currentCache;
  }
}

async function fetchAndProcessFeed(url, sourceLabel, stats) {
  // Legacy/broken RSS function - kept for reference or future fix
}

async function processSingleItem(item, sourceLabel, stats) {
  // Legacy item processor
}

module.exports = { ingestFromTED };

async function fetchAndProcessFeed(url, sourceLabel, stats) {
  if (!url) {
    console.warn(`⚠️ [Ingest] Skipping empty URL for ${sourceLabel}`);
    return;
  }

  console.log(`\n📡 [${sourceLabel}] Fetching feed: ${url}`);

  try {
    const feed = await parser.parseURL(url);
    console.log(`   Items found: ${feed.items?.length || 0}`);

    if (!feed.items || feed.items.length === 0) {
      console.warn(`   ⚠️ Feed was empty or parsed incorrectly.`);
      return;
    }

    // Process items
    // Limit to 50 per feed to avoid blasting quotas/time
    const items = feed.items.slice(0, 50);

    for (const item of items) {
      stats.processed++;
      try {
        await processSingleItem(item, sourceLabel, stats);
      } catch (itemErr) {
        console.error(`   ❌ Error item "${item.title?.substring(0, 30)}...":`, itemErr.message);
        stats.errors++;
      }
    }

  } catch (err) {
    stats.errors++;
    console.error(`❌ [${sourceLabel}] Fetch Failed!`);
    console.error(`   Status/Code: ${err.code || 'Unknown'}`);
    console.error(`   Message: ${err.message}`);
    // If response provided by parser
    if (err.response) {
      console.error(`   Response Preview: ${JSON.stringify(err.response).substring(0, 200)}`);
    }
  }
}

async function processSingleItem(item, sourceLabel, stats) {
  // 1. Normalization
  const title = (item.title || "Untitled Tender").trim();
  const rawDesc = item.contentSnippet || item.content || item.summary || "";
  const link = item.link || item.guid || "";
  const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

  // Deduplication Key: URL is usually best. 
  // If no URL, use guid.
  const uniqueKey = link || item.guid;

  if (!uniqueKey) {
    throw new Error("No link or guid found for item");
  }

  // Extract budget heuristic
  let budget = null;
  const budgetMatch = rawDesc.match(/[€£$]\s?[\d,]+(\.\d{2})?/);
  if (budgetMatch) budget = budgetMatch[0];

  // Country Heuristic (Expanded)
  if (sourceLabel.includes("UK") || title.includes("United Kingdom") || rawDesc.includes("United Kingdom") || title.includes("London")) country = "UK";
  else if (title.includes("Deutschland") || title.includes("Germany") || title.includes("Berlin") || title.includes("Munich") || title.includes("Hamburg")) country = "DACH";
  else if (title.includes("Österreich") || title.includes("Austria") || title.includes("Wien")) country = "DACH";
  else if (title.includes("Schweiz") || title.includes("Switzerland") || title.includes("Zürich")) country = "DACH";
  else if (title.includes("France") || title.includes("Paris") || rawDesc.includes("France")) country = "FR";
  else if (title.includes("Ireland") || rawDesc.includes("Ireland") || title.includes("Dublin")) country = "IE";
  else if (title.includes("Spain") || title.includes("España") || title.includes("Madrid") || title.includes("Barcelona")) country = "ES";
  else if (title.includes("Italy") || title.includes("Italia") || title.includes("Roma") || title.includes("Milano")) country = "IT";
  else if (title.includes("Poland") || title.includes("Polska") || title.includes("Warszawa")) country = "PL";
  else if (title.includes("Sweden") || title.includes("Sverige") || title.includes("Stockholm")) country = "SE";
  else if (title.includes("Netherlands") || title.includes("Nederland") || title.includes("Amsterdam")) country = "NL";
  else if (title.includes("Belgium") || title.includes("Belgique") || title.includes("Brussels")) country = "BE";
  else if (title.includes("Norway") || title.includes("Norge") || title.includes("Oslo")) country = "NO";
  else if (title.includes("Denmark") || title.includes("Danmark") || title.includes("Copenhagen")) country = "DK";
  else if (title.includes("Finland") || title.includes("Suomi") || title.includes("Helsinki")) country = "FI";

  // AI Scoring (Mock)
  const aiResult = await calculateMatchScore({
    title,
    description_raw: rawDesc,
    budget
  }, DEMO_COMPANY);

  // 2. Database Upsert
  // We check if it exists
  const existing = await Tender.findOne({ url: uniqueKey });

  if (existing) {
    // Optional: Update if needed? For now we skip to save writes if unchanged
    // stats.updated++; // Uncomment if we implement update logic
    // console.log(`   (Skipping duplicate: ${uniqueKey.substring(0, 40)}...)`);
    return;
  }

  await Tender.create({
    source: sourceLabel,
    title: title,
    description_raw: rawDesc,
    short_description: rawDesc.substring(0, 250) + (rawDesc.length > 250 ? "..." : ""),
    authority: item.creator || "Public Authority",
    country: country,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // Default +30 days
    url: uniqueKey,
    published_at: pubDate,
    match_score: aiResult.score,
    rationale: aiResult.rationale,
    budget: budget
  });

  stats.new++;

  // Cache for Limited Mode (No DB) - using file now
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let currentCache = [];
  try {
    if (fs.existsSync(TENDERS_FILE)) {
      currentCache = JSON.parse(fs.readFileSync(TENDERS_FILE, "utf-8"));
    }
  } catch (e) { console.warn("Read cache fail", e); }

  // Create deterministic ID so links don't break on restart
  const stableString = uniqueKey + title;
  let hash = 0;
  for (let i = 0; i < stableString.length; i++) {
    const char = stableString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const deterministicId = "det_" + Math.abs(hash).toString(16);

  const newTender = {
    _id: deterministicId,
    source: sourceLabel,
    title: title,
    description_raw: rawDesc,
    short_description: rawDesc.substring(0, 250) + "...",
    authority: item.creator || "Public Authority",
    country: country,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    url: uniqueKey,
    published_at: pubDate,
    match_score: aiResult.score,
    rationale: aiResult.rationale,
    budget: budget
  };

  currentCache.unshift(newTender);
  if (currentCache.length > 100) currentCache.pop(); // Keep file size sane

  fs.writeFileSync(TENDERS_FILE, JSON.stringify(currentCache, null, 2));

  // Sync global limit for this runtime
  global.latestTendersCache = currentCache;
}

module.exports = { ingestFromTED };
