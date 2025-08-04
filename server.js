require('dotenv').config();

// --- Core Packages ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// --- Service-Specific Packages ---
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { TwitterApi } = require('twitter-api-v2');
const sgMail = require('@sendgrid/mail');
const { nanoid } = require('nanoid');

// --- Local Modules ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CORS Configuration ---
const whitelist = ['https://www.ailucius.com', 'http://localhost:5173', 'http://localhost:5174'];
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

// --- Core Middleware ---
// ... (Full setup code for Stripe Webhook, JSON, Session, Passport Strategies, etc.)

// --- PUBLIC API ROUTES ---
// ... (Full public API routes for the demo, hooks, tone analyzer, etc.)

// --- PRIVATE (AUTHENTICATED) API ROUTES ---

// UPGRADED AI Text Generation (Social Studio) with Robust Error Handling
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { return res.status(404).json({ message: "User not found." }); }
        
        if (!user.isPro && user.credits < 1) {
            return res.status(402).json({ message: 'You have run out of credits.' });
        }

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required.' });
        }

        // Use the user's brand voice, with a fallback to a default prompt
        const systemPrompt = user.brandVoicePrompt || "You are an expert social media marketer.";

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
        });
        
        const text = completion.choices[0].message.content;
        
        if (!user.isPro) {
            user.credits -= 1;
        }
        
        const newConversation = new Conversation({
            userId: user._id,
            title: prompt.substring(0, 40) + "...",
            messages: [
                { role: 'user', content: prompt },
                { role: 'model', content: text }
            ]
        });
        
        await Promise.all([user.save(), newConversation.save()]);

        res.json({ text, remainingCredits: user.credits });
    } catch (error) {
        console.error("CRITICAL AI Generation error:", error);
        res.status(500).json({ message: 'An error occurred with the AI. Please check your API key and billing status.' });
    }
});


// ... (All other private routes for Carousel, Hashtags, Campaigns, History, etc.)

// --- AUTOMATED ENGINES (CRON JOBS) ---
// ... (Full cron job logic for credit refills and post scheduling)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});