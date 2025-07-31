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
// ... (Full Passport.js config and other middleware) ...
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));


// --- API ROUTES ---
// ... (Auth, User, AI Generation, Carousel, Hashtag, History, and Stripe routes) ...


// --- NEW: AI WEEKLY PLANNER ROUTE ---
app.post('/api/ai/generate-weekly-plan', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { return res.status(404).json({ message: "User not found." }); }

        const planCost = 5; // This is a premium tool, costs 5 credits
        if (!user.isPro && user.credits < planCost) {
            return res.status(402).json({ message: `Not enough credits. The Weekly Planner costs ${planCost} credits.` });
        }

        const { topic, audience } = req.body;
        const prompt = `
            Act as an expert social media content strategist. My primary topic for the week is "${topic}". My target audience is "${audience}".
            Create a strategic 7-day content plan. The goal is to build engagement and provide value.
            The output must be a valid JSON object. The root object should have keys: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday".
            For each day, the value should be another object with two keys: "theme" (e.g., "Educational Post", "Behind the Scenes", "Question of the Day") and "idea" (a specific post idea for that day).
            Example for one day: "monday": { "theme": "Motivational Monday", "idea": "Post a short, inspiring story related to the main topic." }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }, // Enforce JSON output
        });

        const weeklyPlan = JSON.parse(completion.choices[0].message.content);

        if (!user.isPro) {
            user.credits -= planCost;
            await user.save();
        }

        res.json({ weeklyPlan, remainingCredits: user.credits });

    } catch (error) {
        console.error("Weekly Plan Generation Error:", error);
        res.status(500).json({ message: "Failed to generate the weekly plan." });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
