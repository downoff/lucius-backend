// routes/tenders.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Lazy-load Tender model (avoids OverwriteModelError on Render)
const Tender = mongoose.models.Tender || require("../models/Tender");

/**
 * GET /api/tenders/matching
 *
 * For now this is a SAFE, SIMPLE implementation for demo:
 * - Returns the latest tenders from Mongo (if any)
 * - Never crashes on missing data
 */
const { fetchTendersByRegion } = require("../services/tendersProvider");
const { ingestFromTED } = require("../services/tenderIngestor");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const TENDERS_FILE = path.join(DATA_DIR, "tenders.json");

// Load persist cache on start
try {
  if (fs.existsSync(TENDERS_FILE)) {
    global.latestTendersCache = JSON.parse(fs.readFileSync(TENDERS_FILE, "utf-8"));
    console.log(`[Tenders] Loaded ${global.latestTendersCache.length} tenders from persistent file.`);
  }
} catch (e) { console.warn("[Tenders] Failed to load local cache file", e); }

/**
 * POST /api/tenders/ingest
 * Trigger manual ingestion (protected)
 */
router.post("/ingest", async (req, res) => {
  const secret = req.headers["x-ingestion-secret"];
  const envSecret = process.env.INGESTION_SECRET;

  if (!envSecret || secret !== envSecret) {
    console.warn(`[Ingest] Unauthorized attempt. IP: ${req.ip}`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("[Ingest] Manual ingestion triggered via API");

  // Start background process
  ingestFromTED()
    .then(() => console.log("[Ingest] Background job finished"))
    .catch(err => console.error("[Ingest] Background job failed:", err));

  return res.json({
    started: true,
    message: "Ingestion started in background. Check server logs for details."
  });
});

/**
 * GET /api/tenders/matching
 *
 * Returns tenders for a specific region (defaults to UK).
 * Query params:
 * - region: "UK", "DACH", "FR", "EU-East", "US", "Middle-East"
 */
router.get("/matching", async (req, res) => {
  try {
    const region = req.query.region || "UK";

    // 1. Fetch active company for personalized matching
    // 1. Fetch active company for personalized matching
    const Company = require("../models/Company");
    let activeCompany = null;

    if (mongoose.connection.readyState === 1) {
      try {
        activeCompany = await Company.findOne({ active: true }).lean().exec();
      } catch (e) { console.warn("Company fetch failed", e); }
    }

    // Fallback if no company is set yet (prevent crash, allows "browse mode")
    const companyContext = activeCompany || {
      company_name: "Guest User",
      keywords_include: ["general", "technology", "services"],
      description: "Generic company profile for browsing public tenders."
    };

    // 2. Fetch tenders for the requested region (External Source)
    let regionalTenders = [];
    try {
      regionalTenders = await fetchTendersByRegion(region, companyContext);
    } catch (fetchErr) {
      console.warn(`[Warning] External tender fetch failed for ${region}:`, fetchErr.message);
      // Continue to load from DB even if external fetch fails
    }

    // 3. Fetch local DB tenders (if any)
    let dbTenders = [];
    try {
      if (mongoose.connection.readyState === 1) {
        dbTenders = await Tender.find({})
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .exec();
      } else {
        console.warn("[Tenders] DB not connected, using cache.");
      }
    } catch (e) {
      console.warn("[Tenders] DB fetch failed, using cache.");
    }

    // Fallback to memory cache if DB is empty (Limited Mode)
    if (dbTenders.length === 0 && global.latestTendersCache) {
      // filter by region if possible, or return all
      dbTenders = global.latestTendersCache;
      if (region && region !== 'UK') {
        // Basic memory filter
        //  dbTenders = dbTenders.filter(t => t.country === region); // Optional strictness
      }
    }

    // 4. Combine
    const combined = [...regionalTenders, ...dbTenders];

    return res.json({ tenders: combined, region });
  } catch (err) {
    console.error("[Error] Failed to fetch matching tenders:", err);
    return res.status(500).json({
      message: "Unable to load tenders at this time. Please try again later."
    });
  }
});

/**
 * GET /api/tenders/:id
 * Used by the TenderDetail page.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Support for in-memory IDs (Limited Mode)
    // Support for in-memory IDs (Limited Mode)
    // Support for in-memory/deterministic IDs (Limited Mode)
    if (id.startsWith("mem_") || id.startsWith("det_")) {
      console.log(`[Diff Debug] Looking for in-memory ID: ${id}`);
      if (!global.latestTendersCache) {
        console.log("[Diff Debug] Cache is empty/undefined");
        return res.status(404).json({ message: "Tender not found (cache empty)" });
      }
      console.log(`[Diff Debug] Cache size: ${global.latestTendersCache.length}`);
      const cachedTender = global.latestTendersCache.find(t => t._id === id);
      if (cachedTender) {
        console.log("[Diff Debug] Found in cache!");
        return res.json(cachedTender);
      }
      console.log("[Diff Debug] Not found in cache.");
      return res.status(404).json({ message: "Tender not found in cache" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid tender id" });
    }

    // Check connection before query to avoid timeout
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database not connected" });
    }

    const tender = await Tender.findById(id).lean().exec();
    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    return res.json(tender);
  } catch (err) {
    console.error("get tender by id error:", err);
    return res.status(500).json({ message: "tender error" });
  }
});

/**
 * GET /api/tenders/demo-seed
 *
 * Helper route so you can quickly populate the DB
 * with 3 example tenders for demo purposes.
 *
 * Call once in browser:
 *   https://lucius-ai.onrender.com/api/tenders/demo-seed
 */
router.get("/demo-seed", async (_req, res) => {
  try {
    const count = await Tender.countDocuments().exec();
    if (count > 0) {
      return res.json({
        ok: true,
        alreadySeeded: true,
        count,
      });
    }

    const now = new Date();
    const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // Fetch real tenders for seeding
    const realTenders = await fetchRealTenders();

    // Take top 3 real tenders, or fallback to hardcoded if fetch fails
    let tendersToInsert = realTenders.slice(0, 3).map(t => ({
      ...t,
      match_score: Math.floor(Math.random() * 15) + 80 // High score for demo
    }));

    if (tendersToInsert.length === 0) {
      // Fallback if RSS fails
      const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      tendersToInsert = [
        {
          title: "Municipal Smart City Portal with AI Assistant",
          short_description: "Design, build and maintain a public-facing portal with multilingual AI chatbot and integrations.",
          description_raw: "The contracting authority seeks a partner to deliver a modern smart city web portal with AI assistant, citizen tickets, and integrations to existing back-office systems.",
          country: "BA",
          deadline: inDays(18),
          budget: "€250,000 – €400,000",
          match_score: 92,
        },
        // ... (keep other fallbacks if desired, or just one is enough)
      ];
    }

    const docs = await Tender.insertMany(tendersToInsert);

    return res.json({
      ok: true,
      seeded: docs.length,
    });
  } catch (err) {
    console.error("demo-seed error:", err);
    return res.status(500).json({ message: "tender error" });
  }
});

module.exports = router;
