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
      "https://ted.europa.eu/en/rss/search?q=cpv:*", // broad search might be too much, let's try top level categories if possible or just rely on keywords
      "https://ted.europa.eu/en/rss/search?q=sector:services",
      "https://ted.europa.eu/en/rss/search?q=sector:works",
      "https://ted.europa.eu/en/rss/search?q=sector:supplies"
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

async function ingestFromTED() {
  const config = getIngestionConfig();
  if (!config.MONGO_URI) {
    console.warn("❌ MISSING ENV: MONGO_URI");
    console.warn("⚠️  Running in LIMITED MODE (In-Memory Cache Only). Tenders will not be saved to DB.");
    // Do NOT return; allow fetching
  }

  // Connect if not connected
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(config.MONGO_URI);
      console.log("📦 [Ingest] Connected to MongoDB");
    } catch (err) {
      console.error("❌ [Ingest] DB Connection Failed:", err.message);
      return;
    }
  }

  let stats = {
    processed: 0,
    new: 0,
    updated: 0,
    errors: 0
  };

  // 1. Ingest EU (TED)
  for (const url of config.TED_RSS_URLS) {
    await fetchAndProcessFeed(url, "TED-EU", stats);
  }

  // 2. Ingest UK
  await fetchAndProcessFeed(config.UK_CONTRACTS_FINDER_URL, "UK-ContractsFinder", stats);

  console.log(`\n🎉 Ingestion Finished. Stats:`, stats);
}

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

  // Country Heuristic
  let country = "EU";
  // Logic updated to be more specific
  if (sourceLabel.includes("UK") || title.includes("United Kingdom") || rawDesc.includes("United Kingdom")) country = "UK";
  else if (title.includes("Deutschland") || title.includes("Germany") || title.includes("Berlin")) country = "DACH";
  else if (title.includes("France") || title.includes("Paris") || rawDesc.includes("France")) country = "FR";
  else if (title.includes("Ireland") || rawDesc.includes("Ireland")) country = "IE";
  else if (title.includes("Spain") || title.includes("España") || title.includes("Madrid")) country = "ES";
  else if (title.includes("Italy") || title.includes("Italia") || title.includes("Roma")) country = "IT";
  else if (title.includes("Poland") || title.includes("Polska")) country = "PL";
  else if (title.includes("Sweden") || title.includes("Sverige")) country = "SE";
  else if (title.includes("Netherlands") || title.includes("Nederland")) country = "NL";

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
