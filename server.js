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

// --- THIS IS THE CRITICAL FIX: Final CORS Configuration ---
const whitelist = [
    'https://www.ailucius.com', 
    'http://localhost:5173', 
    'http://localhost:5174',
];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
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
// ... (Your full Passport.js config for Google and Twitter should be here) ...

// --- PUBLIC API ROUTES ---
// ... (Your full public API routes for the demo, hooks, tone analyzer, etc.) ...

// --- PRIVATE (AUTHENTICATED) API ROUTES ---
// ... (All your private routes for Auth, AI tools, History, Billing, Referrals, etc., should be here) ...

// --- AUTOMATED ENGINES (CRON JOBS) ---
// ... (Your full cron job logic for credit refills and post scheduling should be here) ...

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});