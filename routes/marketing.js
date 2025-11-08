// routes/marketing.js
const router = require("express").Router();
const sgMail = require("@sendgrid/mail");

router.post("/lead", async (req, res) => {
  try {
    const { email, message } = req.body || {};
    if (!email) return res.status(400).json({ message: "email required" });

    const to = process.env.PUBLIC_LEADS_EMAIL || "luciusaicomapny@gmail.com";
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send({
        to,
        from: process.env.PUBLIC_FROM_EMAIL || "noreply@ailucius.com",
        subject: "New site lead",
        text: `Email: ${email}\nMessage: ${message || ""}`,
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "lead error" });
  }
});

module.exports = router;
