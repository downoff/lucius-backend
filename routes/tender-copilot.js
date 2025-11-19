// routes/tender-copilot.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const router = express.Router();
const upload = multer();

// Init OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/tender/upload
 * - Accepts a single PDF file
 * - Returns extracted plain text
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text || "";

    if (!text.trim()) {
      return res.status(422).json({ error: "Could not extract text from PDF." });
    }

    res.json({ text });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "PDF parse error." });
  }
});

/**
 * POST /api/tender/analyze
 * body: { tenderText: string }
 * returns: { analysis: string }
 */
router.post("/analyze", async (req, res) => {
  try {
    const { tenderText } = req.body || {};
    if (!tenderText || !tenderText.trim()) {
      return res.status(400).json({ error: "tenderText is required." });
    }

    const prompt = `
Extract the following from this public tender / RFP:

1. Mandatory requirements
2. Eligibility criteria
3. Technical specifications
4. Evaluation criteria
5. Deadlines & timeline
6. Required documents / forms
7. Risks & red flags (compliance issues)
8. A 5-bullet executive summary in plain language

TENDER TEXT:
"""
${tenderText}
"""
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = completion.choices?.[0]?.message?.content || "";

    res.json({ analysis });
  } catch (err) {
    console.error("Tender analyze error:", err);
    res.status(500).json({ error: "Tender analysis failed." });
  }
});

/**
 * POST /api/tender/proposal
 * body: { analysis: string, companyProfile: string }
 * returns: { proposal: string }
 */
router.post("/proposal", async (req, res) => {
  try {
    const { analysis, companyProfile } = req.body || {};

    if (!analysis || !analysis.trim()) {
      return res.status(400).json({ error: "analysis is required." });
    }
    if (!companyProfile || !companyProfile.trim()) {
      return res.status(400).json({ error: "companyProfile is required." });
    }

    const prompt = `
You are Lucius Tender Copilot, a senior proposal writer.

Use the tender analysis and company profile below to draft a structured proposal suitable for a public tender response.

TENDER ANALYSIS:
"""
${analysis}
"""

COMPANY PROFILE:
"""
${companyProfile}
"""

Write a proposal with these sections:

1. Executive Summary
2. Understanding of Requirements
3. Technical Approach & Methodology
4. Team & Relevant Experience
5. Project Plan & Timeline
6. Quality Assurance & Risk Management
7. Pricing Approach (no exact numbers, but describe model)
8. Compliance Statement
9. Closing

Tone: confident, specific, tender-specific, no generic fluff. Keep it 1,000–1,800 words.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const proposal = completion.choices?.[0]?.message?.content || "";

    res.json({ proposal });
  } catch (err) {
    console.error("Tender proposal error:", err);
    res.status(500).json({ error: "Proposal generation failed." });
  }
});

module.exports = router;
