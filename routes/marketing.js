// routes/marketing.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const sgMail = require("@sendgrid/mail");
const Lead = require("../models/Lead");

// ensure key is set (you already call sgMail.setApiKey in server.js)
if (!process.env.SENDGRID_API_KEY) {
  console.warn("[marketing] SENDGRID_API_KEY missing — lead emails will fail.");
}
const TO_EMAIL = process.env.MARKETING_TO_EMAIL || "luciusaicomapny@gmail.com";
const FROM_EMAIL = process.env.MARKETING_FROM_EMAIL || "luciusaicomapny@gmail.com";

// basic limiter so bots can’t spam
const leadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// health/info
router.get("/health", (_req, res) => {
  res.json({ ok: true, route: "marketing" });
});

/**
 * POST /api/public/lead
 * body: { name, email, company, message }
 */
router.post("/lead", leadLimiter, async (req, res) => {
  try {
    const { name, email, company, message } = req.body || {};
    if (!name || !email || !company) {
      return res.status(400).json({ message: "name, email and company are required" });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";
    const ua = req.headers["user-agent"] || "";

    // save to db
    const lead = await Lead.create({
      name: String(name).trim(),
      email: String(email).trim(),
      company: String(company).trim(),
      message: String(message || "").trim(),
      source: "audit",
      userAgent: ua,
      ip,
    });

    // email notification
    if (process.env.SENDGRID_API_KEY) {
      const subject = `New Tender Audit Lead: ${lead.company} — ${lead.name}`;
      const text =
        `New lead captured on Lucius AI:\n\n` +
        `Name: ${lead.name}\n` +
        `Email: ${lead.email}\n` +
        `Company: ${lead.company}\n` +
        `Message: ${lead.message || "(none)"}\n\n` +
        `IP: ${lead.ip}\nUA: ${lead.userAgent}\n` +
        `Created: ${lead.createdAt}\n`;
      await sgMail.send({
        to: TO_EMAIL,
        from: FROM_EMAIL,
        subject,
        text,
      });
    }

    res.json({ ok: true, id: lead._id });
  } catch (err) {
    console.error("Lead error:", err);
    res.status(500).json({ message: "Failed to capture lead" });
  }
});

module.exports = router;
