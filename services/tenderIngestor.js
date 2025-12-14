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

  // =======================
  // 1. UK CONTRACTS FINDER (OCDS API)
  // =======================
  try {
    const ukUrl = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=50";
    console.log(`📡 [UK-API] Fetching real tenders from: ${ukUrl}`);

    const response = await fetch(ukUrl);

    if (!response.ok) {
      throw new Error(`UK API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [UK-API] Received ${data.results?.length || 0} notices`);

    if (data.results) {
      for (const notice of data.results) {
        try {
          const latestRelease = notice.releases?.[0];
          if (!latestRelease) continue;

          const tenderInfo = latestRelease.tender || {};
          const buyer = latestRelease.buyer || {};

          const tenderObj = {
            title: tenderInfo.title || "Untitled Tender",
            description_raw: tenderInfo.description || "",
            authority: buyer.name || "Public Authority",
            country: "UK",
            region: "UK",
            deadline: tenderInfo.tenderPeriod?.endDate
              ? new Date(tenderInfo.tenderPeriod.endDate)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            url: latestRelease.id
              ? `https://www.contractsfinder.service.gov.uk/Notice/${latestRelease.id}`
              : "",
            published_at: latestRelease.date ? new Date(latestRelease.date) : new Date(),
            budget: tenderInfo.value?.amount
              ? `£${tenderInfo.value.amount.toLocaleString()}`
              : "N/A"
          };

          // Generate AI score
          const aiResult = await calculateMatchScore({
            title: tenderObj.title,
            description_raw: tenderObj.description_raw,
            budget: tenderObj.budget
          }, DEMO_COMPANY);

          const finalTender = {
            ...tenderObj,
            _id: "uk_" + (latestRelease.id || Math.random().toString(36).substr(2, 9)),
            match_score: aiResult.score,
            rationale: aiResult.rationale,
            source: "UK-Official",
            source_url: tenderObj.url
          };

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

  // =======================
  // 2. TED (TENDERS ELECTRONIC DAILY) - EU
  // =======================
  try {
    // Use TED's public API v3 for European tenders
    const tedUrl = "https://publications.europa.eu/resource/authority/contract-type";
    console.log(`📡 [TED-EU] Attempting EU tender fetch...`);

    // Note: TED requires specific API keys and has rate limits
    // For now, we'll use a public search endpoint
    // TODO: Register for TED API access at https://ted.europa.eu/en/api

    console.log("ℹ️ [TED-EU] TED API requires registration. Skipping for now.");
    console.log("ℹ️ [TED-EU] To enable: Register at https://ted.europa.eu/en/api");

  } catch (err) {
    console.error("❌ [TED-EU] Failed:", err.message);
    stats.errors++;
  }

  // =======================
  // 3. MOCK INTERNATIONAL DATA (Temporary)
  // =======================
  // User requested NO mock data, so we skip this entirely
  console.log("ℹ️ [Mock Data] Skipped per user requirement (real data only)");

  console.log(`🎉 Ingestion Finished. Stats:`, stats);
  console.log(`   ✅ Processed: ${stats.processed}`);
  console.log(`   🆕 New: ${stats.new}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
}

// Helper to save to MongoDB (Persistent)
async function addToCache(tender) {
  try {
    // Upsert: Update if exists, Insert if new
    // Matching by URL ensures uniqueness
    await Tender.findOneAndUpdate(
      { url: tender.url },
      { $set: tender },
      { upsert: true, new: true }
    );
    // Optional: Update global memory cache if needed for specialized filtering,
    // but better to rely on DB querying for scale.
  } catch (err) {
    console.error("❌ [DB] Failed to save tender:", err.message);
  }
}

// Stub out legacy functions so we don't crash if called
async function fetchAndProcessFeed(url, sourceLabel, stats) { }
async function processSingleItem(item, sourceLabel, stats) { }

module.exports = { ingestFromTED };
