// routes/tender-ai.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema({
  company_name: String,
  website: String,
  countries: [String],
  cpv_codes: [String],
  keywords_include: [String],
  keywords_exclude: [String],
  max_deadline_days: Number,
  languages: [String],
  contact_emails: [String],
  stripe_customer_id: String,
  billing_status: { type: String, default: "inactive" }
}, { timestamps: true });

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

const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema);
const Tender = mongoose.models.Tender || mongoose.model("Tender", TenderSchema);

// Draft generation (requires active billing)
router.post("/draft", async (req, res) => {
  try {
    const { tender_id } = req.body || {};
    const company = await Company.findOne().sort({ updatedAt: -1 }).lean();
    if (!company) return res.status(400).json({ message: "no company profile" });

    if (company.billing_status !== "active") {
      return res.status(402).json({ message: "payment_required" });
    }

    const tender = await Tender.findById(tender_id).lean();
    if (!tender) return res.status(404).json({ message: "tender not found" });

    // Replace with your OpenAI call if desired
    const draft = [
      `Proposal for: ${tender.title}`,
      ``,
      `Company: ${company.company_name}`,
      `Website: ${company.website || "-"}`,
      ``,
      `Introduction`,
      `We propose to deliver the full specification described by ${tender.authority}, ensuring accessibility and high performance.`,
      ``,
      `Scope of Work`,
      `• Discovery & UX`,
      `• Development & QA`,
      `• Deployment & Training`,
      ``,
      `Timeline`,
      `• Phase 1: 2–3 weeks`,
      `• Phase 2: 3–4 weeks`,
      ``,
      `Budget`,
      `Final pricing depends on details; we provide a transparent milestone-based schedule.`,
      ``,
      `Contact`,
      `${(company.contact_emails||[]).join(", ") || "—"}`
    ].join("\n");

    res.json({ draft });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "draft failed" });
  }
});

module.exports = router;
