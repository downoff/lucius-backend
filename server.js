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
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};
app.use(cors(corsOptions));

// --- Core Middleware ---
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => { /* ... full webhook logic ... */ });
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_lucius', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Passport.js Strategies ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://lucius-ai.onrender.com/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => { /* ... full google strategy logic ... */ }));

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET_KEY,
    callbackURL: "https://lucius-ai.onrender.com/auth/twitter/callback",
    passReqToCallback: true
  }, async (req, token, tokenSecret, profile, done) => { /* ... full twitter strategy logic ... */ }));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => { User.findById(id, (err, user) => done(err, user)); });


// --- PUBLIC API ROUTES ---
const publicApiLimiter = rateLimit({ /* ... full rate limiter config ... */ });
app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => { /* ... full public demo logic ... */ });
app.post('/api/public/generate-hooks', publicApiLimiter, async (req, res) => { /* ... full hooks logic ... */ });
app.post('/api/public/analyze-tone', publicApiLimiter, async (req, res) => { /* ... full tone analyzer logic ... */ });
app.post('/api/public/generate-ig-carousel', publicApiLimiter, async (req, res) => { /* ... full carousel logic ... */ });

// --- CONTACT FORM ROUTE ---
app.post('/api/contact', async (req, res) => { /* ... full contact form logic ... */ });


// --- PRIVATE (AUTHENTICATED) API ROUTES ---

// AUTHENTICATION
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => { /* ... full logic ... */ });
const twitterAuth = (req, res, next) => { /* ... full logic ... */ };
app.get('/auth/twitter', twitterAuth);
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/dashboard?twitter_auth=failed', session: false }), (req, res) => { res.redirect('https://www.ailucius.com/dashboard?twitter_auth=success'); });
app.post('/api/users/register', async (req, res) => { /* ... full registration logic with referral handling ... */ });
app.post('/api/users/login', async (req, res) => { /* ... full login logic ... */ });
app.get('/api/users/me', authMiddleware, async (req, res) => { /* ... full 'me' route logic ... */ });
app.post('/api/users/brand-voice', authMiddleware, async (req, res) => { /* ... full brand voice logic ... */ });

// AI TOOLS (The section with the bug)
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        if (!user.isPro && user.credits < 1) return res.status(402).json({ message: 'You have run out of credits.' });

        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

        const systemPrompt = user.brandVoicePrompt || "You are an expert social media marketer.";

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        });
        
        const text = completion.choices[0].message.content;
        
        if (!user.isPro) user.credits -= 1;
        
        const newConversation = new Conversation({
            userId: user._id,
            title: prompt.substring(0, 40) + "...",
            messages: [{ role: 'user', content: prompt }, { role: 'model', content: text }]
        });
        
        await Promise.all([user.save(), newConversation.save()]);
        res.json({ text, remainingCredits: user.credits });
    } catch (error) {
        console.error("CRITICAL AI Generation error:", error);
        res.status(500).json({ message: 'A critical error occurred with the AI. Please check your OpenAI API key and billing status.' });
    }
});

app.post('/api/ai/generate-carousel', authMiddleware, async (req, res) => { /* ... full, robust carousel logic ... */ });
app.post('/api/ai/get-hashtags', authMiddleware, async (req, res) => { /* ... full, robust hashtag logic ... */ });
app.post('/api/ai/generate-weekly-plan', authMiddleware, async (req, res) => { /* ... full, robust planner logic ... */ });
app.post('/api/ai/generate-campaign', authMiddleware, async (req, res) => { /* ... full, robust campaign logic ... */ });
app.post('/api/ai/generate-image', authMiddleware, async (req, res) => { /* ... full, robust image gen logic ... */ });

// HISTORY & BILLING
app.get('/api/ai/history', authMiddleware, async (req, res) => { /* ... full history logic ... */ });
app.get('/api/ai/conversation/:id', authMiddleware, async (req, res) => { /* ... full single conversation logic ... */ });
app.post('/api/ai/conversation/:id/continue', authMiddleware, async (req, res) => { /* ... full continue conversation logic ... */ });
app.get('/api/content-hub', authMiddleware, async (req, res) => { /* ... full content hub logic ... */ });
app.post('/create-customer-portal-session', authMiddleware, async (req, res) => { /* ... full portal logic ... */ });

// SCHEDULER
app.post('/api/schedule-post', authMiddleware, async (req, res) => { /* ... full schedule post logic ... */ });
app.get('/api/scheduled-posts', authMiddleware, async (req, res) => { /* ... full get scheduled posts logic ... */ });

// --- AUTOMATED ENGINES (CRON JOBS) ---
cron.schedule('0 0 * * *', async () => { /* ... full credit refill logic ... */ });
cron.schedule('* * * * *', async () => { /* ... full post publishing logic ... */ });

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});