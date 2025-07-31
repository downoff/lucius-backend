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

// --- Middleware, DB, and Passport Setup ---
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details.email;
        const stripeCustomerId = session.customer;
        const plan = session.metadata.plan;

        try {
            const user = await User.findOne({ email: customerEmail });
            if (user) {
                user.stripeCustomerId = stripeCustomerId;

                if (plan === 'pro') {
                    user.isPro = true;
                    user.credits += 500;
                } else if (plan === 'starter') {
                    user.isPro = false;
                    user.credits += 100;
                }
                
                await user.save();
                console.log(`Subscription updated for ${user.email}, plan: ${plan}`);
            }
        } catch (dbError) {
            console.error('DB error during subscription update:', dbError);
        }
    }
    res.json({received: true});
});

app.use(cors({ origin: ["https://www.ailucius.com", "http://127.0.0.1:5500", "http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_lucius', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://lucius-ai.onrender.com/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) { return done(null, user); }
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        user.name = user.name || profile.displayName;
        await user.save();
        return done(null, user);
      } else {
        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
        });
        await newUser.save();
        return done(null, newUser);
      }
    } catch (error) {
      return done(error, null);
    }
  }
));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => { User.findById(id, (err, user) => done(err, user)); });


// --- API ROUTES ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => {
    const payload = { user: { id: req.user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
    res.redirect(`https://www.ailucius.com/auth-success.html?token=${token}`);
});

app.post('/api/users/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) { return res.status(400).json({ message: 'User with this email already exists.' }); }
        user = new User({ email, password, name: email.split('@')[0] });
        await user.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.password) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

app.get('/api/users/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) { return res.status(404).json({ message: 'User not found.' }); }
        res.json(user);
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// --- NEW: SAVE BRAND VOICE ROUTE ---
app.post('/api/users/brand-voice', authMiddleware, async (req, res) => {
    try {
        const { brandVoice } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // We construct a system prompt from the user's input
        user.brandVoicePrompt = `You are an expert social media marketer. Your writing style and tone must be strictly: "${brandVoice}".`;
        await user.save();
        res.json({ message: 'Brand voice updated successfully!', brandVoice: user.brandVoicePrompt });
    } catch (error) {
        console.error("Error updating brand voice:", error);
        res.status(500).json({ message: 'Failed to update brand voice.' });
    }
});


// --- UPGRADED AI ROUTES WITH BRAND VOICE ---

// AI Text Generation (Social Studio)
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { return res.status(404).json({ message: "User not found." }); }
        
        if (!user.isPro && user.credits < 1) {
            return res.status(402).json({ message: 'You have run out of credits.' });
        }

        const { prompt } = req.body;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: user.brandVoicePrompt }, // <-- BRAND VOICE USED
                { role: "user", content: prompt }
            ],
        });
        
        const text = completion.choices[0].message.content;
        
        if (!user.isPro) {
            user.credits -= 1;
            await user.save();
        }
        
        const newConversation = new Conversation({
            userId: user._id,
            title: prompt.substring(0, 40) + "...",
            messages: [
                { role: 'user', content: prompt },
                { role: 'model', content: text }
            ]
        });
        await newConversation.save();

        res.json({ text, remainingCredits: user.credits });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred with the AI.' });
    }
});

// AI Carousel Creator
app.post('/api/ai/generate-carousel', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const carouselCost = 3;
        if (!user.isPro && user.credits < carouselCost) {
            return res.status(402).json({ message: `Not enough credits. Carousel generation costs ${carouselCost} credits.` });
        }

        const { topic } = req.body;
        const prompt = `
            You are an expert social media strategist. Create the content for a 5-slide Instagram or LinkedIn carousel about the topic: "${topic}".
            Structure the output as a JSON object with the following keys: "slide1_title", "slide2_intro", "slide3_point1", "slide4_point2", "slide5_cta".
            Each piece of content should be concise and engaging.
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: user.brandVoicePrompt }, // <-- BRAND VOICE USED
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
        });
        
        const carouselData = JSON.parse(completion.choices[0].message.content);

        if (!user.isPro) {
            user.credits -= carouselCost;
            await user.save();
        }
        
        res.json({ carouselData, remainingCredits: user.credits });
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate carousel.' });
    }
});

// AI Hashtag Generator
app.post('/api/ai/get-hashtags', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const hashtagCost = 1;
        if (!user.isPro && user.credits < hashtagCost) {
            return res.status(402).json({ message: `Not enough credits. Hashtag generation costs ${hashtagCost} credit.` });
        }

        const { topic, platform } = req.body;
        const prompt = `
            Act as a social media marketing expert for the platform: ${platform}.
            My post is about the topic: "${topic}".
            Generate a strategic list of 30 hashtags as a JSON object with three keys: "popular", "niche", and "trending".
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: user.brandVoicePrompt }, // <-- BRAND VOICE USED
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
        });
        
        const hashtagData = JSON.parse(completion.choices[0].message.content);

        if (!user.isPro) {
            user.credits -= hashtagCost;
            await user.save();
        }
        
        res.json({ hashtagData, remainingCredits: user.credits });
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate hashtags.' });
    }
});

// AI Weekly Planner
app.post('/api/ai/generate-weekly-plan', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const planCost = 5;
        if (!user.isPro && user.credits < planCost) {
            return res.status(402).json({ message: `Not enough credits. The Weekly Planner costs ${planCost} credits.` });
        }

        const { topic, audience } = req.body;
        const prompt = `
            Act as an expert social media content strategist. My primary topic for the week is "${topic}". My target audience is "${audience}".
            Create a strategic 7-day content plan as a JSON object with keys for each day of the week.
            Each day should have a "theme" and an "idea".
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: user.brandVoicePrompt }, // <-- BRAND VOICE USED
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
        });
        
        const weeklyPlan = JSON.parse(completion.choices[0].message.content);

        if (!user.isPro) {
            user.credits -= planCost;
            await user.save();
        }
        
        res.json({ weeklyPlan, remainingCredits: user.credits });
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate weekly plan.' });
    }
});


// --- HISTORY & BILLING ROUTES ---
app.get('/api/ai/history', authMiddleware, async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history.' });
    }
});

app.get('/api/ai/conversation/:id', authMiddleware, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversation.' });
    }
});

app.post('/create-customer-portal-session', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.stripeCustomerId) {
            return res.status(400).json({ message: 'User is not a paying customer.' });
        }
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: 'https://www.ailucius.com/dashboard',
        });
        res.json({ url: portalSession.url });
    } catch (error) {
        res.status(500).json({ message: 'Error creating customer portal session.' });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
