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
  // GPT-4o has 128k token context. 100,000 characters is roughly 25k tokens, well within limits.
  // For 500-page PDFs (~200k+ tokens), a Map-Reduce approach would be needed.
  // For this release, we maximize the first pass context to cover 95% of tenders.
  const safeText = text.substring(0, 100000); // Increased from 15k

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

/**
 * Granular generation with specific prompts for different sections.
 * @param {string} text - The raw text.
 * @param {string} type - 'compliance' | 'risk' | 'proposal'
 * @returns {Promise<object>}
 */
async function generateWithFallback(text, type) {
  // Demo Mode override
  if (!openai || process.env.AI_DEMO_MODE === "true") {
    const mock = mockAnalysis(text);
    if (type === 'compliance') return { requirements: mock.compliance_matrix };
    if (type === 'risk') return { score: mock.risk_score };
    if (type === 'proposal') return { text: mock.generated_proposal_draft };
  }

  const safeText = text.substring(0, 100000);
  let systemPrompt = "";

  if (type === 'compliance') {
    systemPrompt = `Extract a compliance matrix. Output JSON: { "requirements": [{ "requirement": "string", "source_page": number, "status": "compliant"|"risk" }] }`;
  } else if (type === 'risk') {
    systemPrompt = `Analyze risk. Output JSON: { "score": number (0-100), "rationale": "string" }`;
  } else if (type === 'proposal') {
    systemPrompt = `Draft a proposal. Output JSON: { "text": "markdown string" }`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context:\n${safeText}` }
      ],
      temperature: 0.2,
    });
    return JSON.parse(completion.choices[0].message.content);

  } catch (error) {
    console.error(`[AIService] ${type} generation failed:`, error.message);
    throw error;
  }
}

module.exports = { analyzeTenderText, generateWithFallback };
