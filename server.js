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
// ... (Your full Passport.js config for Google and Twitter should be here) ...

// --- PUBLIC API ROUTES ---
const publicApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'You have reached the limit for our free tools. Please sign up for more.' }
});
app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => { /* ... full demo logic ... */ });
// ... (all other public routes)

// --- CONTACT FORM ROUTE ---
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    const content = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const msg = {
        to: 'luciusaicompany@gmail.com', // <-- CHANGE THIS
        from: 'contact@ailucius.com', // This MUST be a verified sender in SendGrid
        subject: `New Message from Lucius AI Contact Form: ${name}`,
        text: content,
    };
    try {
        await sgMail.send(msg);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('SendGrid Error:', error.response ? error.response.body : error);
        res.status(500).json({ message: 'Error sending message.' });
    }
});

// --- PRIVATE (AUTHENTICATED) API ROUTES ---
// ... (All your private routes for Auth, AI tools, History, Billing, etc.) ...

// --- AUTOMATED ENGINES (CRON JOBS) ---
// ... (Your full cron job logic for credit refills and post scheduling) ...

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});