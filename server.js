require('dotenv').config();

// --- Package Imports ---
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

// --- Local Module Imports ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

// --- Initializations ---
const app = express();
const port = 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware Setup ---
app.use(cors({ origin: ["https://www.ailucius.com", "http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5173"] }));
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => { /* ... full webhook logic ... */ });
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch((err) => console.error('MongoDB connection error:', err));

// --- Passport.js Config ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://lucius-ai.onrender.com/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => { /* ... full Google strategy logic ... */ }
));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => { User.findById(id, (err, user) => done(err, user)); });


// --- API ROUTES ---

// Google Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => {
    const payload = { user: { id: req.user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
    res.redirect(`https://www.ailucius.com/auth-success.html?token=${token}`);
});

// User Auth Routes
app.post('/api/users/register', async (req, res) => { /* ... full register route ... */ });
app.post('/api/users/login', async (req, res) => { /* ... full login route ... */ });
app.get('/api/users/me', authMiddleware, async (req, res) => { /* ... full 'me' route ... */ });


// V3: UPGRADED AI GENERATION ROUTE WITH REAL-TIME STREAMING
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { return res.status(404).json({ message: "User not found." }); }
        if (user.credits <= 0) { return res.status(402).json({ message: 'You have run out of credits.' });}

        const { prompt } = req.body;

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Send headers immediately

        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            stream: true, // Enable streaming from OpenAI
        });

        let fullResponse = "";
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            // Send each chunk of text to the frontend as it arrives
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }

        // After the stream is complete, save the conversation and subtract a credit
        user.credits -= 1;
        await user.save();
        
        const newConversation = new Conversation({
            userId: user.id,
            title: prompt.substring(0, 40) + "...",
            messages: [
                { role: 'user', content: prompt },
                { role: 'model', content: fullResponse }
            ]
        });
        await newConversation.save();
        
        console.log(`Stream completed and saved for user ${user.email}. Credits remaining: ${user.credits}`);
        res.end(); // End the streaming connection

    } catch (error) {
        console.error("Streaming API error:", error);
        res.end(); // Ensure the connection is closed on error
    }
});


// All other routes for image generation, scheduler, etc. would follow.


// --- Start the Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});