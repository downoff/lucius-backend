require('dotenv').config();

// --- Core Packages ---
const express = require('express');
const cors = require('cors');
// ... all other core packages

// --- Service-Specific Packages ---
const OpenAI = require('openai');
// ... all other service packages

// --- Local Modules ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
// ... all other models

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// ... other initializations

// --- Final CORS Configuration ---
// ... (Your full CORS config)

// --- Core Middleware ---
// ... (Your full middleware config)

// --- Database Connection ---
// ... (Your full DB connection logic)

// --- Passport.js Strategies ---
// ... (Your full Passport.js config)


// --- THE BULLETPROOF TIMEOUT ENGINE ---
const withTimeout = (promise, ms) => {
    const timeout = new Promise((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`AI request timed out after ${ms / 1000} seconds. Please try again.`));
        }, ms);
    });
    return Promise.race([promise, timeout]);
};


// --- PUBLIC API ROUTES ---
app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

        const completionPromise = openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are an expert social media marketer." }, { role: "user", content: prompt }],
        });

        const completion = await withTimeout(completionPromise, 30000); // 30-second timeout

        res.json({ text: completion.choices[0].message.content });
    } catch (error) {
        console.error("Public Demo Error:", error);
        res.status(500).json({ message: error.message || 'An error occurred with the AI.' });
    }
});
// ... (All other public routes updated with the timeout)


// --- PRIVATE (AUTHENTICATED) API ROUTES ---
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        // ... (user and credit check logic)
        const { prompt } = req.body;
        
        const systemPrompt = user.brandVoicePrompt || "You are an expert social media marketer.";

        const completionPromise = openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        });

        const completion = await withTimeout(completionPromise, 30000); // 30-second timeout

        const text = completion.choices[0].message.content;
        // ... (credit subtraction and conversation saving logic)
        res.json({ text, remainingCredits: user.credits });
    } catch (error) {
        console.error("CRITICAL AI Generation error:", error);
        res.status(500).json({ message: error.message || 'An error occurred with the AI.' });
    }
});

// ... (All other private AI routes updated with the timeout)

// --- AUTOMATED ENGINES (CRON JOBS) ---
// ... (Full cron job logic)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});