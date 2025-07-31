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

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

const app = express();
const port = process.env.PORT || 3000; // <-- The missing line is here
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware, DB, and Passport Setup ---
// ... (Full setup code for Stripe Webhook, CORS, JSON, Session, Passport Strategies)

// --- API ROUTES ---
// ... (Full API routes for Auth, AI tools, History, Billing, Twitter Connect, etc.)

// --- AUTOMATED PUBLISHING CRON JOB ---
// ... (Full cron job logic)

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});
