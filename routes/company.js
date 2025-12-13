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

// Status (for navbar/pricing gating)
router.get("/status", async (_req, res) => {
  try {
    console.log("[API] GET /company/status hit");
    const c = await Company.findOne({ active: true }).sort({ updatedAt: -1 });
    if (!c) {
      console.log("[API] No active company found");
      return res.json({ exists: false });
    }
    return res.json({
      ok: true,
      exists: true,
      company: {
        id: c._id,
        company_name: c.company_name,
        stripe_customer_id: c.stripe_customer_id || null,
      },
      is_paid: Boolean(c.stripe_customer_id),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "company status error" });
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
