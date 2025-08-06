const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Rate Limiter for all public routes
const publicApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'You have reached the limit for our free tools. Please sign up for more.' }
});

// All public routes are now here
router.post('/generate-demo', publicApiLimiter, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are an expert social media marketer." }, { role: "user", content: prompt }],
        });
        
        res.json({ text: completion.choices[0].message.content });
    } catch (error) {
        console.error("Public Demo Error:", error);
        res.status(500).json({ message: 'An error occurred with the AI.' });
    }
});

// ... (Your other public routes like /generate-hooks, /analyze-tone, etc., go here)

module.exports = router;