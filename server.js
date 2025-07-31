require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware, DB, and Passport Setup (No Changes) ---
// This is a summary. Your full code should be here.
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => { /* ... full webhook logic ... */ });
app.use(cors({ origin: ["https://www.ailucius.com", "http://127.0.0.1:5500", "http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_lucius', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
// ... (Full Passport.js config) ...

// --- API ROUTES ---
// ... (Auth, User, AI Generation, and Stripe routes) ...

// --- CHAT HISTORY ROUTE ---
app.get('/api/ai/history', authMiddleware, async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history.' });
    }
});

// --- NEW: FETCH SINGLE CONVERSATION ROUTE ---
app.get('/api/ai/conversation/:id', authMiddleware, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ 
            _id: req.params.id, 
            userId: req.user.id // Security check to ensure the user owns this conversation
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        
        res.json(conversation);

    } catch (error) {
        console.error("Error fetching single conversation:", error);
        res.status(500).json({ message: 'Error fetching conversation.' });
    }
});

// --- STRIPE CUSTOMER PORTAL ROUTE ---
// ... (Full customer portal logic) ...

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
