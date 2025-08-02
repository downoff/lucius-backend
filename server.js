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

// This is the correct order: define 'app' before using it.
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Final CORS Configuration ---
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
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => { /* ... full webhook logic ... */ });
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_lucius', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
// ... (Full Passport.js config for Google and Twitter)

// --- PUBLIC API ROUTES ---
const publicApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { message: 'You have reached the limit for our free tools. Please try again later or sign up for more.' }
});

app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => { /* ... existing demo code ... */ });
app.post('/api/public/generate-hooks', publicApiLimiter, async (req, res) => { /* ... existing hooks code ... */ });
app.post('/api/public/analyze-tone', publicApiLimiter, async (req, res) => { /* ... existing tone analyzer code ... */ });


// --- PRIVATE API ROUTES ---
// ... (All your existing private, protected API routes for Auth, AI tools, History, Billing, etc.)

// --- AUTOMATED ENGINES ---
// ... (Full cron job logic for credit refills and post scheduling)

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});