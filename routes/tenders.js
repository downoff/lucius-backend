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
router.get("/matching", async (_req, res) => {
  try {
    const tenders = await Tender.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    return res.json({ tenders });
  } catch (err) {
    console.error("matching tenders error:", err);
    return res.status(500).json({ message: "tender error" });
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

    const docs = await Tender.insertMany([
      {
        title: "Municipal Smart City Portal with AI Assistant",
        short_description:
          "Design, build and maintain a public-facing portal with multilingual AI chatbot and integrations.",
        description_raw:
          "The contracting authority seeks a partner to deliver a modern smart city web portal with AI assistant, citizen tickets, and integrations to existing back-office systems.",
        country: "BA",
        deadline: inDays(18),
        budget: "€250,000 – €400,000",
        match_score: 92,
      },
      {
        title: "Cloud Migration & Managed Services Framework",
        short_description:
          "Multi-year framework for migration to cloud and DevOps services for public agencies.",
        description_raw:
          "Framework agreement for cloud migration, DevOps, monitoring, and ongoing support for 15+ government entities.",
        country: "DE",
        deadline: inDays(30),
        budget: "€1M – €3M over 4 years",
        match_score: 78,
      },
      {
        title: "AI Chatbot for Tax Administration Contact Centre",
        short_description:
          "AI assistant for citizen FAQs, integrated with knowledge base and ticketing system.",
        description_raw:
          "The tax administration is procuring an AI-based chatbot and knowledge base solution to answer citizen questions and reduce inbound call volume.",
        country: "AT",
        deadline: inDays(10),
        budget: "€150,000 – €250,000",
        match_score: 86,
      },
    ]);

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
