// routes/company.js
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
  billing_status: { type: String, default: "inactive" } // "active" when paid
}, { timestamps: true });

const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema);

// Create/Update company profile
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const doc = await Company.findOneAndUpdate(
      { website: payload.website || "" },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "company create/update failed" });
  }
});

// Status (latest profile)
router.get("/status", async (_req, res) => {
  try {
    const doc = await Company.findOne().sort({ updatedAt: -1 }).lean();
    res.json(doc || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "status failed" });
  }
});

module.exports = router;
