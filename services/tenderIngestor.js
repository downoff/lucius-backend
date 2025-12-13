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
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    let currentCache = [];
    try {
      if (fs.existsSync(TENDERS_FILE)) {
        currentCache = JSON.parse(fs.readFileSync(TENDERS_FILE, "utf-8"));
      }
    } catch (e) { }

    // Dedup by URL or title
    const exists = currentCache.find(t => t.url === tender.url || (t.title === tender.title && t.authority === tender.authority));
    if (!exists) {
      // Add new at top
      currentCache.unshift(tender);
      // Keep file size manageable (200 max)
      if (currentCache.length > 200) currentCache = currentCache.slice(0, 200);
      fs.writeFileSync(TENDERS_FILE, JSON.stringify(currentCache, null, 2));

      // Update memory cache immediately
      global.latestTendersCache = currentCache;
    }
  }

// Stub out legacy functions so we don't crash if called
async function fetchAndProcessFeed(url, sourceLabel, stats) { }
  async function processSingleItem(item, sourceLabel, stats) { }

  module.exports = { ingestFromTED };
  ```
