require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');

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
const Canvas = require('./models/Canvas');
const Win = require('./models/Win');

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CORS Configuration & Core Middleware ---
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
app.use(express.json());
app.use(session({ 
    secret: 'a_very_secret_key_for_lucius_final', 
    resave: false, 
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Health Check Route ---
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Passport.js Strategies ---
// (Your full Passport.js config for Google and Twitter should be here)

// --- PUBLIC API ROUTES ---
const publicApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'You have reached the limit for our free tools.' }
});

// --- FINAL "GOD-LIKE" ROUTE: THE CANVA MAGIC ENGINE ---
app.post('/api/public/generate-for-canva', publicApiLimiter, async (req, res) => {
    try {
        const { topic, templateId } = req.body;
        if (!topic || !templateId) {
            return res.status(400).json({ message: 'Topic and template ID are required.' });
        }
        // This prompt is engineered to be perfect for a visual template
        const prompt = `Act as a world-class copywriter. My audience is on Instagram. My topic is "${topic}". Generate the perfect, concise text to fit an Instagram template called "${templateId}". The output should be a single, engaging, and visually scannable paragraph.`;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
        });
        res.json({ text: completion.choices[0].message.content });
    } catch (error) {
        console.error("Canva Magic Error:", error);
        res.status(500).json({ message: "Failed to generate text." });
    }
});


// ... (All your other public and private API routes)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});