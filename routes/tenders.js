// routes/tenders.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const TenderSchema = new mongoose.Schema({
  source: String,
  title: String,
  description_raw: String,
  authority: String,
  country: String,
  deadline_iso: String,
  cpv_codes: [String],
  url: String,
  relevance_score: Number
}, { timestamps: true });

const Tender = mongoose.models.Tender || mongoose.model("Tender", TenderSchema);

// Seed demo data (idempotent-ish)
router.post("/seed", async (_req, res) => {
  try {
    const data = [
      {
        source: "TED",
        title: "Development of municipal web portal with AI chatbot",
        description_raw: "The City seeks a vendor to build a web portal with AI chat, CMS, accessibility.",
        authority: "City of Rivertown",
        country: "HR",
        deadline_iso: new Date(Date.now() + 1000*60*60*24*21).toISOString(),
        cpv_codes: ["72000000","72200000"],
        url: "https://ted.europa.eu/notice/1234",
        relevance_score: 88
      },
      {
        source: "E-nabava",
        title: "Mobile app for public transport (Android/iOS)",
        description_raw: "Cross-platform mobile app + admin portal.",
        authority: "Public Transport Authority",
        country: "BA",
        deadline_iso: new Date(Date.now() + 1000*60*60*24*14).toISOString(),
        cpv_codes: ["72400000"],
        url: "https://example.gov/pt-app",
        relevance_score: 76
      }
    ];
    await Tender.deleteMany({});
    await Tender.insertMany(data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "seed failed" });
  }
});

// List
router.get("/", async (_req, res) => {
  try {
    const items = await Tender.find({}).sort({ relevance_score: -1 }).lean();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "list failed" });
  }
});

// Detail
router.get("/:id", async (req, res) => {
  try {
    const it = await Tender.findById(req.params.id).lean();
    if (!it) return res.status(404).json({ message: "not found" });
    res.json(it);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "detail failed" });
  }
});

module.exports = router;
