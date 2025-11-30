const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/tools/bid-no-bid
 * Analyzes a tender text and provides a Go/No-Go recommendation with a score.
 */
router.post('/bid-no-bid', async (req, res) => {
    try {
        const { tenderText, companyProfile } = req.body;

        if (!tenderText) {
            return res.status(400).json({ error: 'Tender text is required' });
        }

        const prompt = `
        You are a Bid/No-Bid Decision Expert for government contracts.
        
        Analyze the following tender opportunity against the company profile (if provided) or general best practices.
        
        TENDER TEXT:
        """
        ${tenderText.substring(0, 5000)}
        """
        
        COMPANY PROFILE:
        """
        ${companyProfile || 'Not provided. Assume a general SME government contractor.'}
        """
        
        Task:
        1. Calculate a "Win Probability Score" (0-100).
        2. Provide a clear "GO" or "NO GO" recommendation.
        3. List 3 Pros (Why we might win).
        4. List 3 Cons (Risks/Blockers).
        
        Output format (JSON):
        {
            "score": 75,
            "recommendation": "GO",
            "pros": ["Reason 1", "Reason 2", "Reason 3"],
            "cons": ["Risk 1", "Risk 2", "Risk 3"],
            "summary": "Short explanation..."
        }
        `;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a strategic bid manager. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        res.json(result);

    } catch (error) {
        console.error('Bid/No-Bid Analysis failed:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

module.exports = router;
