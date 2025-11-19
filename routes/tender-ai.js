// routes/tender-ai.js
const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const mongoose = require("mongoose");

// Lazy models (avoids OverwriteModelError on Render)
const Company = mongoose.models.Company || require("../models/Company");
const Tender = mongoose.models.Tender || require("../models/Tender");

// Init OpenAI client (might not have key in demo)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

function buildFallbackDraft(finalRequirementsText, companyBrief) {
  return `
# Proposal Draft – Lucius AI (Fallback)

## Executive Summary

We propose to act as your long-term digital partner for designing, building, and maintaining modern public sector solutions. Our team combines experience with government projects, user-centric design, and AI-powered services to deliver reliable outcomes on time and within budget.

This proposal responds to the tender requirements and outlines how we will approach discovery, implementation, quality assurance, and ongoing support.

## Understanding of Requirements

Based on the tender information, the contracting authority is looking for a partner to deliver:

- Modern digital services for citizens and internal stakeholders
- Clear governance, documentation, and risk management
- A solution that can evolve over time

Key points from the tender:

${finalRequirementsText}

We understand that compliance, transparency, and predictable delivery are critical for public sector work.

## Technical Approach

Our approach is structured in phases:

1. **Discovery & Analysis** – Clarify scope, stakeholders, and existing systems. Define detailed requirements and risks.
2. **Solution Design** – Design the architecture, data flows, and integrations. Validate approach with the contracting authority.
3. **Implementation** – Develop the solution using modern frameworks and best practices for security, performance, and maintainability.
4. **Testing & Acceptance** – System, integration, and user acceptance testing, with clear criteria linked to the tender requirements.
5. **Handover & Training** – Documentation, knowledge transfer, and training sessions.
6. **Ongoing Support** – Corrective and adaptive maintenance as agreed in the contract.

We emphasize modular architecture, API-first design, and clear observability (monitoring, logging, alerts).

## Team & Relevant Experience

Our team typically includes:

- **Project Manager** – Main point of contact, manages scope and communication.
- **Lead Architect / Senior Engineer** – Owns technical design and quality.
- **Backend & Frontend Engineers** – Implement features and integrations.
- **QA Engineer** – Ensures quality through test plans and automation.
- **DevOps / Cloud Engineer** – Handles deployment, scalability, and security.

We have delivered similar projects for public sector and regulated environments, focusing on reliability, security, and usability.

## Project Plan & Timeline

A typical project plan would look like:

- Weeks 1–2: Discovery, workshops, detailed planning.
- Weeks 3–6: Core implementation of main features.
- Weeks 7–8: Integrations, refinements, and internal testing.
- Weeks 9–10: User acceptance testing and adjustments.
- Week 11+: Go-live, monitoring, and stabilization.

Exact dates and milestones would be refined with the contracting authority.

## Quality & Risk Management

We manage quality and risk through:

- Clear acceptance criteria linked to tender requirements
- Regular status updates and demos
- Issue and risk register with owners and mitigation actions
- Version control, code review, and automated testing
- Security by design (least privilege, encryption, audit logs where needed)

## Pricing Approach

We typically work with:

- A **fixed-price** component for clearly defined scope, and
- A **time-and-materials** component for change requests or additional scope.

Pricing is based on seniority, complexity, and support requirements. Detailed pricing would be provided in the commercial section or annex as specified by the tender.

## Compliance Statement

We will comply with:

- The technical and functional requirements defined in the tender
- Applicable standards and guidelines for public sector IT projects
- Security, data protection, and accessibility requirements as specified

Any non-compliance or deviations will be clearly identified and discussed in advance.

## Closing

We believe we are well positioned to deliver a robust, future-proof solution for the contracting authority. We would be pleased to present this approach in more detail and adjust it to your specific needs.

Kind regards,

The Lucius AI Tender Copilot Team

---

**Company Profile (summary used for tailoring):**

${companyBrief}
`.trim();
}

/**
 * PAYWALL GUARD
 * - Used only for /generate (DB tenders, more advanced flow)
 * - Draft endpoint (/draft) is open for now so you can demo freely
 */
async function ensurePaid(req, res, next) {
  try {
    // For testing/demo you can still bypass everything with PAYWALL_FREE=1
    if (String(process.env.PAYWALL_FREE || "") === "1") return next();

    const companyId = req.body?.company_id || req.query?.company_id;
    if (!companyId) {
      return res.status(400).json({ message: "company_id required." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

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
 * 🔓 DEMO-FRIENDLY:
 * POST /api/ai-tender/draft
 *
 * - DOES NOT REQUIRE company_id
 * - Accepts multiple possible field names:
 *   requirements, tender_text, text, body, content, requirementsText
 * - If OpenAI fails or key is missing, returns fallback draft (no 500)
 */
router.post("/draft", async (req, res) => {
  try {
    const {
      requirements,
      extraInstructions,
      tender_text,
      text,
      body,
      content,
      requirementsText: requirementsTextFromBody,
      company_id,
    } = req.body || {};

    // Try all possible keys to find "the tender text"
    const rawRequirements =
      [requirements, tender_text, text, body, content, requirementsTextFromBody]
        .filter((v) => typeof v === "string" && v.trim().length > 0)[0] || "";

    // Optional company enrichment (never fails hard)
    let company = null;
    if (company_id) {
      try {
        company = await Company.findById(company_id);
      } catch (err) {
        console.warn("Optional company lookup failed in /draft:", err?.message);
      }
    }

    const companyBrief = company
      ? `
Company: ${company.company_name || "N/A"}
Website: ${company.website || "N/A"}
Countries: ${(company.countries || []).join(", ") || "N/A"}
CPV: ${(company.cpv_codes || []).join(", ") || "N/A"}
Keywords include: ${(company.keywords_include || []).join(", ") || "N/A"}
Keywords exclude: ${(company.keywords_exclude || []).join(", ") || "N/A"}
Languages: ${(company.languages || []).join(", ") || "N/A"}
`
      : `
Company: Unspecified vendor (generic IT / consulting)
Website: N/A
Countries: N/A
CPV: N/A
Keywords include: N/A
Keywords exclude: N/A
Languages: English
`;

    // If we truly got no tender text at all, still produce a generic proposal
    const finalRequirementsText =
      rawRequirements ||
      "The contracting authority is looking for a digital services partner to design, build and maintain modern solutions for public sector stakeholders.";

    // If no OpenAI key – immediately return fallback draft (no error)
    if (!process.env.OPENAI_API_KEY) {
      const fallback = buildFallbackDraft(finalRequirementsText, companyBrief);
      return res.json({ draft: fallback, meta: { source: "fallback" } });
    }

    const prompt = `
You are Lucius Tender AI, a senior proposal writer.

Create a professional proposal draft based on:

TENDER REQUIREMENTS:
"""
${finalRequirementsText}
"""

EXTRA INSTRUCTIONS:
"""
${extraInstructions || "None"}
"""

COMPANY PROFILE:
"""
${companyBrief}
"""

Write a structured response with:
1. Executive Summary
2. Understanding of Requirements
3. Technical Approach
4. Team & Relevant Experience
5. Project Plan & Timeline
6. Quality & Risk Management
7. Pricing Approach (model-only, no exact numbers)
8. Compliance Statement
9. Closing

Tone: confident, specific, public-sector appropriate, no generic fluff.
Limit length to about 1,000–1,800 words.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      });

      const textOut = completion.choices?.[0]?.message?.content || "";
      if (!textOut.trim()) {
        // If OpenAI returns empty, still fallback
        const fallback = buildFallbackDraft(finalRequirementsText, companyBrief);
        return res.json({
          draft: fallback,
          meta: { source: "fallback-empty-openai" },
        });
      }

      return res.json({ draft: textOut, meta: { source: "openai" } });
    } catch (aiErr) {
      console.error("OpenAI error in /draft, using fallback:", aiErr);
      const fallback = buildFallbackDraft(finalRequirementsText, companyBrief);
      return res.json({ draft: fallback, meta: { source: "fallback-error" } });
    }
  } catch (e) {
    console.error("AI draft error (/draft):", e);
    // Absolute last resort – still return fallback instead of 500
    const fallback = buildFallbackDraft(
      "High-level digital services tender.",
      "Generic company profile."
    );
    return res.json({ draft: fallback, meta: { source: "fallback-catch-all" } });
  }
});

/**
 * POST /api/ai-tender/generate
 * - More advanced flow, still paywalled using ensurePaid
 * - Here we keep 500 behaviour if OpenAI fails (you probably won't use this in demo)
 */
router.post("/generate", ensurePaid, async (req, res) => {
  try {
    const { tender_text, tender_id, persona } = req.body || {};
    let inputText = tender_text?.trim() || "";

    // If id provided, pull tender from DB
    if (!inputText && tender_id) {
      const t = await Tender.findById(tender_id);
      if (!t) {
        return res.status(404).json({ message: "Tender not found." });
      }
      inputText = [t.title, t.description_raw].filter(Boolean).join("\n\n");
    }

    if (!inputText) {
      return res
        .status(400)
        .json({ message: "Provide tender_text or tender_id." });
    }

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
      ...(parsed.sections || []).map(
        (s) => `\n## ${s.heading}\n\n${s.content}`
      ),
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
