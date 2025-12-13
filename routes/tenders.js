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

    // 1. Fetch tenders for the requested region (External Source)
    let regionalTenders = [];
    try {
      regionalTenders = await fetchTendersByRegion(region);
    } catch (fetchErr) {
      console.warn(`[Warning] External tender fetch failed for ${region}:`, fetchErr.message);
      // Continue to load from DB even if external fetch fails
    }

    // 2. Fetch local DB tenders (if any)
    const dbTenders = await Tender.find({})
      .sort({ createdAt: -1 })
      .limit(50) // Increased limit to seeing more ingested data
      .lean()
      .exec();

    // 3. Combine (Deduplicate based on ID or URL if needed, mostly handled by frontend key)
    // For now simple concat is fine as they come from different sources usually
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid tender id" });
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
