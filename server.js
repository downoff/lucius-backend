require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit'); // <-- NEW
// ... all other package requires

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
// ... other model requires

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware, DB, and Passport Setup (No Changes) ---
// ... (Full setup code) ...

// --- API ROUTES ---
// ... (All existing private API routes - No Changes) ...


// --- NEW: PUBLIC DEMO ROUTE WITH RATE LIMITING ---
const demoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.post('/api/public/generate-demo', demoLimiter, async (req, res) => {
    try {
        const { prompt } = req.body;
        const systemPrompt = "You are an expert social media marketer. Your writing style is witty and engaging.";

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
        });
        
        const text = completion.choices[0].message.content;
        res.json({ text });
    } catch (error) {
        console.error("Public demo error:", error);
        res.status(500).json({ message: 'An error occurred with the AI.' });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
