const Parser = require("rss-parser");
const mongoose = require("mongoose");
const Tender = require("../models/Tender");
const { calculateMatchScore } = require("./scoring");

// Lazy load db connection if run as script
require("dotenv").config();

const parser = new Parser();

// TED RSS Feeds (High value sectors: IT, Business Services)
const TED_FEEDS = [
  // IT Services: 72000000
  "https://ted.europa.eu/en/rss/search?q=cpv:72*",
  // Business Services: 79000000
  "https://ted.europa.eu/en/rss/search?q=cpv:79*"
];

// Fallback/Demo Feed (UK Contracts Finder if TED is flaky)
const UK_FEED = "https://www.contractsfinder.service.gov.uk/Search/RSS.xml";

const DEMO_COMPANY = {
  company_name: "LuciusAI User",
  keywords_include: ["software", "digital", "data", "cloud", "consultancy", "platform"],
  keywords_exclude: ["construction", "cleaning", "catering", "fuel"],
};

async function ingestFromTED() {
  console.log("🚀 Starting Tender Ingestion...");

  // Ensure DB connection if not already active
  if (mongoose.connection.readyState === 0) {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is missing in .env");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📦 Connected to MongoDB");
  }

  let totalIngested = 0;
  let totalErrors = 0;

  // 1. Try TED Feeds first
  for (const url of TED_FEEDS) {
    try {
      console.log(`📡 Fetching feed: ${url}`);
      // Note: In some environments TED RSS might block or timeout. 
      // We wrap in try/catch to ensure we continue.
      const feed = await parser.parseURL(url);
      console.log(`   Found ${feed.items.length} items`);

      for (const item of feed.items) {
        await processItem(item, "TED");
        totalIngested++;
      }
    } catch (err) {
      console.error(`⚠️ Failed to fetch TED feed: ${err.message}`);
      totalErrors++;
    }
  }

  // 2. Fetch UK Feed as well for good measure (High quality English data)
  try {
    console.log(`📡 Fetching UK Contracts Finder: ${UK_FEED}`);
    const feed = await parser.parseURL(UK_FEED);
    console.log(`   Found ${feed.items.length} items`);
    for (const item of feed.items.slice(0, 50)) { // Limit to 50 latest
      await processItem(item, "ContractsFinder");
      totalIngested++;
    }
  } catch (err) {
    console.error(`⚠️ Failed to fetch UK feed: ${err.message}`);
    totalErrors++;
  }

  console.log(`✅ Ingestion Complete. Processed: ${totalIngested}, Errors: ${totalErrors}`);

  // Close connection if this script opened it (simple check)
  // In a long-running app usage, we wouldn't close.
  if (process.argv[1].endsWith("ingestTenders.js")) {
    await mongoose.connection.close();
    process.exit(0);
  }
}

async function processItem(item, sourceName) {
  try {
    // 1. Normalize Fields
    const title = item.title?.trim() || "Untitled Tender";
    const description = item.contentSnippet || item.content || "";
    const sourceId = item.guid || item.link; // Unique ID
    const url = item.link;
    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

    // Extract budget if possible (Very rough regex)
    const budgetMatch = description.match(/[€£$]\s?[\d,]+(\.\d{2})?/);
    const budget = budgetMatch ? budgetMatch[0] : null;

    // AI Scoring (Mock/Heuristic for now to save API costs, or use scoring service)
    // We use our existing scoring logic
    const aiResult = await calculateMatchScore({
      title,
      description_raw: description,
      budget,
    }, DEMO_COMPANY);

    // 2. Upsert into DB
    // We use source + sourceId as unique key to prevent duplicates
    await Tender.updateOne(
      { url: url }, // Use URL as unique key if sourceId is unstable
      {
        $set: {
          source: sourceName,
          title: title,
          description_raw: description,
          short_description: description.substring(0, 200) + "...",
          authority: item.creator || "Public Authority", // RSS often lacks this, defaults placeholder
          country: sourceName === "ContractsFinder" ? "UK" : "EU", // TED covers EU, but we can't easily parse country from simple RSS
          deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // Placeholder: +30 days (RSS rarely has deadline)
          url: url,
          published_at: pubDate,
          match_score: aiResult.score,
          rationale: aiResult.rationale,
          budget: budget
        }
      },
      { upsert: true }
    );
    // process.stdout.write("."); // Progress dot
  } catch (err) {
    console.error(`Error processing item ${item.title}:`, err.message);
  }
}

module.exports = { ingestFromTED };
