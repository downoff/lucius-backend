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
const sharp = require('sharp'); // The powerful image engine

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

// --- FINAL "GOD-LIKE" ROUTE: THE "SIGNATURE STAMP" ENGINE ---
app.post('/api/public/generate-image-from-text', publicApiLimiter, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required.' });
        }

        // Create a beautiful, multi-line SVG template
        const svgImage = `
        <svg width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1E293B;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0F172A;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="1080" height="1080" fill="url(#grad1)"/>
            <foreignObject x="100" y="100" width="880" height="880">
                <p xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-size: 72px; font-family: sans-serif; font-weight: bold; text-align: center; margin: 0; padding: 0; line-height: 1.3; display: flex; align-items: center; justify-content: center; height: 100%;">
                    ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </p>
            </foreignObject>
            <text x="540" y="1020" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF60" font-size="28" font-family="sans-serif">
                Generated with Lucius AI
            </text>
        </svg>
        `;

        // Use Sharp to convert the SVG to a high-quality PNG buffer
        const pngBuffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

        // Send the image directly to the browser
        res.set('Content-Type', 'image/png');
        res.send(pngBuffer);

    } catch (error) {
        console.error("Sharable Image Error:", error);
        res.status(500).json({ message: "Failed to generate image." });
    }
});


// ... (All your other public and private API routes)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});