// routes/company.js
const router = require("express").Router();
const Company = require("../models/Company");

// Create/replace (simple upsert by active flag)
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    // Keep most recent as "active"
    await Company.updateMany({}, { $set: { active: false } });
    const doc = await Company.create({ ...payload, active: true });
    return res.json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "company create error" });
  }
});

// Status (for navbar gating and health checks)
router.get("/status", async (_req, res) => {
  try {
    // Return simple JSON to satisfy connectivity checks
    // And include active company if exists for the frontend
    const mongoose = require("mongoose");
    let c = null;

    if (mongoose.connection.readyState === 1) {
      c = await Company.findOne({ active: true }).sort({ updatedAt: -1 });
    } else {
      // Mock response for Limited Mode
      c = {
        _id: "limited_mode_guest",
        company_name: "Guest (Limited Mode)",
        stripe_customer_id: null
      };
    }

    const response = {
      ok: true,
      service: "lucius-backend",
      time: new Date().toISOString(),
      exists: !!c,
      is_paid: c ? Boolean(c.stripe_customer_id) : false,
      company: c ? {
        id: c._id,
        company_name: c.company_name,
        stripe_customer_id: c.stripe_customer_id || null,
      } : null
    };

    return res.json(response);
  } catch (e) {
    console.error("[Company Status Error]", e);
    // Explicitly return JSON error
    return res.status(500).json({ ok: false, message: "company status error", error: String(e) });
  }
});

// Get latest company doc
router.get("/", async (_req, res) => {
  try {
    const c = await Company.findOne({ active: true }).sort({ updatedAt: -1 });
    if (!c) return res.status(404).json({ message: "no company" });
    return res.json(c);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "company get error" });
  }
});

module.exports = router;
