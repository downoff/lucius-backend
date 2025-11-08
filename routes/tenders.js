// routes/tenders.js
const router = require("express").Router();
const Tender = require("../models/Tender");
const Company = require("../models/Company");
const { scoreTender } = require("../utils/score");

// Seed demo tenders (idempotent)
router.post("/seed", async (_req, res) => {
  try {
    const count = await Tender.countDocuments();
    if (count > 0) return res.json({ ok: true, already: true });

    await Tender.insertMany([
      {
        source: "TED",
        title: "Development of municipal web portal with AI chatbot",
        description_raw:
          "The City seeks a vendor to build a web portal with AI chat, CMS, accessibility, and integrations.",
        authority: "City of Example",
        country: "DE",
        deadline_iso: new Date(Date.now() + 1000 * 3600 * 24 * 21).toISOString(),
        cpv_codes: ["72000000", "72400000"],
        url: "https://ted.europa.eu/portal",
      },
      {
        source: "eNabava",
        title: "Mobile app + web CMS for cultural events",
        description_raw:
          "Tourist board requests design and development of mobile apps (iOS/Android) plus a CMS.",
        authority: "Tourist Board",
        country: "HR",
        deadline_iso: new Date(Date.now() + 1000 * 3600 * 24 * 35).toISOString(),
        cpv_codes: ["72200000", "72400000"],
        url: "https://example.hr/tender",
      },
    ]);

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "seed error" });
  }
});

// List tenders, scored for the latest company
router.get("/", async (_req, res) => {
  try {
    const tenders = await Tender.find().sort({ createdAt: -1 }).lean();
    const company = await Company.findOne({ active: true }).sort({
      updatedAt: -1,
    });

    const out = tenders.map(t => ({
      ...t,
      relevance_score: scoreTender(t, company),
    }));

    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "tenders error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const t = await Tender.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ message: "not found" });
    const company = await Company.findOne({ active: true }).sort({
      updatedAt: -1,
    });
    const relevance_score = scoreTender(t, company);
    return res.json({ ...t, relevance_score });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "tender error" });
  }
});

module.exports = router;
