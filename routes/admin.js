// routes/admin.js
const express = require("express");
const router = express.Router();

// Stub admin endpoint for leads (wire to DB if storing)
router.get("/leads", async (_req, res) => {
  res.json({ items: [] });
});

module.exports = router;
