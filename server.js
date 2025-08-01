require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cron = require('node-cron');
const { TwitterApi } = require('twitter-api-v2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- FINAL CORS Configuration ---
const whitelist = [
    'https://www.ailucius.com', 
    'http://localhost:5173', 
    'http://localhost:5174',
];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};
app.use(cors(corsOptions));


// --- Middleware, DB, and Passport Setup ---
// ... (Your full setup code for Stripe Webhook, JSON, Session, Passport, etc.)

// --- API ROUTES ---

// PUBLIC DEMO ROUTE WITH RATE LIMITING
const demoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again later.' }
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
        res.json({ text: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred with the AI.' });
    }
});

// ... (All your other private API routes for Auth, AI tools, History, Billing, etc.)

// --- AUTOMATED PUBLISHING CRON JOB ---
// ... (Full cron job logic)

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});