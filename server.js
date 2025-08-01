require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai'); // <-- The missing line is here
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cron = require('node-cron');
const { TwitterApi } = require('twitter-api-v2');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware, DB, and Passport Setup ---
// ... (Full setup code for Stripe Webhook, CORS, JSON, Session, Passport Strategies) ...
// NOTE: The full code for middleware and passport strategies should be in your file.
// This is a condensed representation. The key fix is the require statement above.

// --- API ROUTES ---

// PUBLIC DEMO ROUTE WITH RATE LIMITING
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


// ... (All other existing API routes for Auth, AI tools, History, Billing, etc.) ...
// NOTE: Ensure all your other routes are present in your file.

// --- AUTOMATED PUBLISHING CRON JOB ---
// ... (Full cron job logic) ...

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});