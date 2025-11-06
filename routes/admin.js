// routes/admin.js
const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");

// --- simple guard using an env password ---
// Send as query ?key=... or header x-admin-key: ...
function checkAdmin(req, res, next) {
  const keyFromEnv = process.env.ADMIN_DASH_PASSWORD || "";
  const key =
    req.query.key ||
    req.headers["x-admin-key"] ||
    req.headers["x-adminkey"] ||
    "";
  if (!keyFromEnv) {
    return res.status(500).json({ message: "ADMIN_DASH_PASSWORD not set" });
  }
  if (key !== keyFromEnv) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// health
router.get("/health", (_req, res) => res.json({ ok: true, route: "admin" }));

// list leads (JSON)
router.get("/leads", checkAdmin, async (_req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, leads });
});

// export leads (CSV)
router.get("/leads.csv", checkAdmin, async (_req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).lean();
  const header = [
    "createdAt",
    "name",
    "email",
    "company",
    "message",
    "source",
    "ip",
    "userAgent",
    "_id",
  ];
  const esc = (v) =>
    (v ?? "")
      .toString()
      .replace(/"/g, '""')
      .replace(/\r?\n/g, " ")
      .trim();

  const rows = [
    header.join(","),
    ...leads.map((l) =>
      [
        l.createdAt?.toISOString?.() || l.createdAt || "",
        esc(l.name),
        esc(l.email),
        esc(l.company),
        esc(l.message || ""),
        esc(l.source || ""),
        esc(l.ip || ""),
        esc(l.userAgent || ""),
        esc(l._id?.toString() || ""),
      ].join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
  res.send(rows);
});

module.exports = router;
