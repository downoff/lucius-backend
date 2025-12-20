const OpenAI = require("openai");

// Initialize OpenAI Logic
// We use a factory/singleton pattern effectively by just exporting the functions
let openai = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Robustly extract structure from text using OpenAI JSON Mode.
 * @param {string} text - The raw text from the PDF.
 * @param {object} context - Company context for matching.
 * @returns {Promise<object>} - Structured analysis.
 */
async function analyzeTenderText(text, context = {}) {
  // 1. Demo Mode / Fallback
  if (!openai || process.env.AI_DEMO_MODE === "true") {
    console.log("[AIService] Using Demo Mode (Mock Data)");
    return mockAnalysis(text);
  }

  // 2. Prepare Prompt
  // Truncate text to avoid token limits (approx 12k chars ~ 3k tokens, safe for 4o-mini)
  const safeText = text.substring(0, 15000);

  const systemPrompt = `You are an expert Bid Manager. 
  Extract a strict JSON object from the Tender Document provided.
  Analyze risks, compliance requirements, and draft a proposal strategy.
  
  Output Schema:
  {
    "compliance_matrix": [
      { "requirement": "string", "source_page": number (approx), "status": "compliant" | "non_compliant" | "risk" }
    ],
    "risk_score": number (0-100),
    "deadlines": [{ "label": "string", "date": "YYYY-MM-DD" }],
    "generated_proposal_draft": "string (markdown)"
  }`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Or "gpt-4-turbo" / "gpt-3.5-turbo-0125"
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Company Context: ${JSON.stringify(context)}\n\nTender Text:\n${safeText}` }
      ],
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result;

  } catch (error) {
    console.error("[AIService] Error:", error.message);
    throw error;
  }
}

function mockAnalysis(text) {
  return {
    compliance_matrix: [
      { requirement: "ISO 27001 Certification", source_page: 4, status: "compliant" },
      { requirement: "Turnover > £5M", source_page: 8, status: "risk" },
      { requirement: "Social Value Plan", source_page: 12, status: "compliant" }
    ],
    risk_score: 85,
    deadlines: [{ label: "Submission", date: "2025-05-30" }],
    generated_proposal_draft: "## Executive Summary\n\nWe are pleased to submit our proposal..."
  };
}

module.exports = { analyzeTenderText };
