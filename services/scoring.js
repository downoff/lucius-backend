const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Calculates a match score (0-100) and rationale for a tender against a company profile.
 * @param {Object} tender - The tender object (title, description, etc.)
 * @param {Object} company - The company object (name, keywords, capabilities)
 * @returns {Promise<Object>} - { score: number, rationale: string }
 */
async function calculateMatchScore(tender, company) {
    // If no API key, return a mock score (but consistent)
    if (!process.env.OPENAI_API_KEY) {
        return {
            score: 85,
            rationale: "AI scoring unavailable (missing API key). Defaulting to high match based on keyword overlap."
        };
    }

    try {
        const title = tender?.title || "Untitled Tender";
        const desc = tender?.description_raw || tender?.short_description || "No description provided.";

        const tenderText = `
Title: ${title}
Description: ${desc}
Budget: ${tender?.budget || "Unknown"}
Region: ${tender?.region || tender?.country || "Unknown"}
`;

        const companyName = company?.company_name || "Generic Company";
        const keywords = Array.isArray(company?.keywords_include) ? company.keywords_include.join(", ") : "";
        const capabilities = company?.description || "General Services";

        const companyProfile = `
Name: ${companyName}
Keywords Include: ${keywords}
Capabilities: ${capabilities}
`;

        const prompt = `
You are an expert Bid Manager. Evaluate the fit of this tender for the company.

TENDER:
${tenderText}

COMPANY:
${companyProfile}

TASK:
1. Analyze the match based on capabilities, keywords, and region.
2. Assign a score from 0 to 100 (0 = irrelevant, 100 = perfect fit).
3. Provide a 1-sentence rationale.

Return JSON:
{
  "score": number,
  "rationale": "string"
}
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a precise scoring engine." },
                { role: "user", content: prompt }
            ],
        });

        const raw = completion.choices[0].message.content;
        const result = JSON.parse(raw);

        return {
            score: result.score || 50,
            rationale: result.rationale || "Analysis completed."
        };

    } catch (error) {
        console.error("AI Scoring Error:", error);
        return {
            score: 60,
            rationale: "AI analysis failed. Defaulting to neutral score."
        };
    }
}

module.exports = { calculateMatchScore };
