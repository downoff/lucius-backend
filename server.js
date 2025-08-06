require('dotenv').config();

// --- Core Packages ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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
const whitelist = ['https://www.ailucius.com', 'http://localhost:5173', 'http://localhost:5174'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};
app.use(cors(corsOptions));
app.use(express.json()); // This line is crucial for handling POST requests

// --- Health Check Route ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// --- PUBLIC API ROUTES ---
const publicApiLimiter = rateLimit({ /* ... */ });

// This is the correct POST route for the demo
app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => {
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

// ... (All other public and private routes)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});