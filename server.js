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
const OpenAI = require('openai');
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

// --- NEW: CORS Configuration ---
const whitelist = [
    'https://www.ailucius.com', 
    'http://localhost:5173', 
    'http://localhost:5174', // Add any other local dev ports you use
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
// ... (The rest of your middleware, like Stripe Webhook, express.json, Session, Passport Strategies, etc.)

// --- API ROUTES ---
// ... (All your existing API routes)

// --- AUTOMATED PUBLISHING CRON JOB ---
// ... (Full cron job logic)

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});
