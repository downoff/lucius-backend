// routes/admin.js
const router = require("express").Router();

// Simple ping
router.get("/ping", (_req, res) => res.json({ ok: true }));

module.exports = router;
