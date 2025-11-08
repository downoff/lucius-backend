// routes/tender-ai.js
const router = require("express").Router();
const Company = require("../models/Company");

// Simple, deterministic draft text (replace with OpenAI if you want)
function makeDraft(tender, company) {
  return `Proposal Draft for: ${tender.title}

Client: ${tender.authority}
Country: ${tender.country}
Deadline: ${tender.deadline_iso || "n/a"}
URL: ${tender.url || "n/a"}

About ${company.company_name}:
- Website: ${company.website || "n/a"}
- Strengths: ${company.keywords_include?.join(", ") || "-"}

Approach:
1) Discovery & planning aligned to CPV: ${(tender.cpv_codes || []).join(", ")}
2) Build & integrate CMS/AI components
3) QA, accessibility, deployment, training

We look forward to collaborating.
`;
}

router.post("/draft", async (req, res) => {
  try {
    const { tender } = req.body || {};
    if (!tender || !tender.title)
      return res.status(400).json({ message: "tender required" });

    // Paywall check — require stripe_customer_id
    const company = await Company.findOne({ active: true }).sort({
      updatedAt: -1,
    });
    if (!company) return res.status(400).json({ message: "no company" });
    if (!company.stripe_customer_id) {
      return res.status(402).json({
        message: "payment required",
        code: "PAYWALL",
      });
    }

    const draft = makeDraft(tender, company);
    return res.json({ draft });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "draft error" });
  }
});

module.exports = router;
