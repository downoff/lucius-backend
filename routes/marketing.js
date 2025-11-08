// routes/marketing.js
const express = require("express");
const router = express.Router();
const sgMail = require("@sendgrid/mail");

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Lead endpoint
router.post("/lead", async (req, res) => {
  try {
    const { email, name, note } = req.body || {};
    if (!process.env.LEADS_TO_EMAIL || !process.env.LEADS_FROM_EMAIL) {
      return res.status(200).json({ ok: true, note: "email not configured; skipping send" });
    }
    const msg = {
      to: process.env.LEADS_TO_EMAIL,
      from: process.env.LEADS_FROM_EMAIL,
      subject: "New Lucius lead",
      text: `Email: ${email}\nName: ${name || ""}\nNote: ${note || ""}`,
    };
    await sgMail.send(msg);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "lead failed" });
  }
});

// Press endpoint
router.post("/press", async (req, res) => {
  try {
    const { email, message } = req.body || {};
    if (!process.env.PRESS_TO_EMAIL || !process.env.LEADS_FROM_EMAIL) {
      return res.status(200).json({ ok: true, note: "email not configured; skipping send" });
    }
    const msg = {
      to: process.env.PRESS_TO_EMAIL,
      from: process.env.LEADS_FROM_EMAIL,
      subject: "Press message",
      text: `From: ${email}\n\n${message || ""}`,
    };
    await sgMail.send(msg);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "press failed" });
  }
});

module.exports = router;
