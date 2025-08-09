require('dotenv').config();

// --- Core Packages & Modules ---
const aiGenerateShareRoutes = require('./routes/ai-generate-share'); // new file
const publicShareRoutes = require('./routes/publicShare');           // new file
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
app.use('/', aiGenerateShareRoutes);      // this exposes /api/ai/generate
app.use('/', publicShareRoutes);   

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Health Check Route ---
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Passport.js Strategies ---
// (Your full Passport.js config for Google and Twitter should be here)

// --- PUBLIC API ROUTES ---
// (Your full public API routes for the demo, hooks, tone analyzer, etc.)

// --- PRIVATE (AUTHENTICATED) API ROUTES ---

// UPGRADED USER REGISTRATION ROUTE with Referral Logic
app.post('/api/users/register', async (req, res) => {
    try {
        const { email, password, referralCode } = req.body;
        let user = await User.findOne({ email });
        if (user) { return res.status(400).json({ message: 'User with this email already exists.' }); }

        let referredByUser = null;
        if (referralCode) {
            referredByUser = await User.findOne({ referralCode });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user = new User({ 
            email, 
            password, 
            name: email.split('@')[0],
            emailVerificationToken: verificationToken,
            referredBy: referredByUser ? referredByUser._id : null
        });
        await user.save();

        if (referredByUser) {
            referredByUser.referrals.push(user._id);
            referredByUser.credits += 50; // The reward bonus
            await referredByUser.save();
            console.log(`User ${referredByUser.email} was rewarded for referring ${user.email}`);
        }

        // Send the verification email
        const verificationUrl = `https://www.ailucius.com/verify-email?token=${verificationToken}`;
        const msg = {
            to: user.email,
            from: 'support@ailucius.com',
            subject: 'Welcome to Lucius AI! Please Verify Your Email',
            html: `Thank you for signing up! Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`,
        };
        await sgMail.send(msg);

        res.status(201).json({ message: 'Success! Please check your email to verify your account.' });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// ... (All your other private routes for login, 'me', brand voice, AI tools, etc.)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});
