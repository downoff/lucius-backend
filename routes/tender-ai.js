// routes/tender-ai.js
const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const mongoose = require("mongoose");

// Lazy models (avoids OverwriteModelError on Render)
const Company = mongoose.models.Company || require("../models/Company");
const Tender = mongoose.models.Tender || require("../models/Tender");

// Init OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * PAYWALL GUARD
 * - Free users can list tenders
 * - Draft generation requires paid company (has stripe_customer_id) OR PAYWALL_FREE=1
 */
async function ensurePaid(req, res, next) {
  try {
    if (String(process.env.PAYWALL_FREE || "") === "1") return next();

    const companyId = req.body?.company_id || req.query?.company_id;
    if (!companyId) return res.status(400).json({ message: "company_id required." });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    if (!company.stripe_customer_id) {
      return res.status(402).json({
        message: "Payment required. Please subscribe to generate drafts.",
        code: "PAYWALL",
      });
    }

    req.company = company;
    next();
  } catch (e) {
    console.error("ensurePaid error:", e);
    res.status(500).json({ message: "Server error (paywall)." });
  }
}

/**
 * POST /api/ai-tender/generate
 * body: { tender_text?: string, tender_id?: string, company_id: string, persona?: string }
 * returns: { draft, sections, meta }
 */
router.post("/generate", ensurePaid, async (req, res) => {
  try {
    const { tender_text, tender_id, persona } = req.body;
    let inputText = tender_text?.trim() || "";

    // If id provided, pull tender from DB
    if (!inputText && tender_id) {
      const t = await Tender.findById(tender_id);
      if (!t) return res.status(404).json({ message: "Tender not found." });
      inputText = [t.title, t.description_raw].filter(Boolean).join("\n\n");
    }

    if (!inputText) {
      return res.status(400).json({ message: "Provide tender_text or tender_id." });
    }

    // Build brief using the company profile
    const c = req.company; // from ensurePaid
    const companyBrief = `
Company: ${c.company_name || "N/A"}
Website: ${c.website || "N/A"}
Countries: ${(c.countries || []).join(", ") || "N/A"}
CPV: ${(c.cpv_codes || []).join(", ") || "N/A"}
Include: ${(c.keywords_include || []).join(", ") || "N/A"}
Exclude: ${(c.keywords_exclude || []).join(", ") || "N/A"}
Languages: ${(c.languages || []).join(", ") || "N/A"}
Contact Emails: ${(c.contact_emails || []).join(", ") || "N/A"}
`;

    const sys = `You are a senior proposal writer. Write concise, persuasive tenders with clear sections:
1. Executive Summary
2. Understanding of Requirements
3. Technical Approach & Methodology
4. Team & Relevant Experience
5. Timeline
6. Pricing (range or model)
7. Compliance Matrix (short)
8. Risks & Mitigations
9. Closing & Next Steps

Tone: confident, specific, verifiable. Avoid fluff.`;

    const userPrompt = `
TENDER TEXT:
"""
${inputText}
"""

COMPANY PROFILE:
"""
${companyBrief}
"""

Persona (optional): ${persona || "general B2B IT vendor"}

TASK:
Write a complete draft proposal tailored to the tender text and company profile.
Return JSON with:
{
  "title": "string",
  "sections": [
    {"heading": "Executive Summary", "content": "..." },
    ...
  ],
  "closing": "short closing paragraph"
}

Keep it 1,000–1,800 words, concrete and tender-specific.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If model returned plain text, wrap it
      parsed = {
        title: "Proposal Draft",
        sections: [{ heading: "Draft", content: raw }],
        closing: "",
      };
    }

    const fullText = [
      `# ${parsed.title || "Proposal Draft"}`,
      ...(parsed.sections || []).map(s => `\n## ${s.heading}\n\n${s.content}`),
      parsed.closing ? `\n\n${parsed.closing}` : "",
    ].join("\n");

    res.json({
      draft: fullText,
      sections: parsed.sections || [],
      meta: {
        model: "gpt-4o-mini",
        company_id: c._id,
      },
    });
  } catch (e) {
    console.error("generate draft error:", e);
    res.status(500).json({ message: "AI generation failed." });
  }
});

module.exports = router;
