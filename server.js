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
const ScheduledPost = require('./models/ScheduledPost'); // Assuming this model exists
const Conversation = require('./models/Conversation'); // Assuming this model exists

// --- Initializations ---
const app = express();
const port = 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware Setup ---
app.use(cors({ origin: ["https://www.ailucius.com", "http://127.0.0.1:5500", "http://localhost:5500"] }));

// Stripe Webhook route must be before express.json()
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log(' ✅  Stripe Webhook Verified.');
    } catch (err) {
        console.log(` ❌  Error verifying webhook signature: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details.email;
        try {
            const user = await User.findOne({ email: customerEmail });
            if (user) {
                user.isPro = true;
                // Add credits when a user upgrades
                user.credits += 500; // Example: give 500 credits on purchase
                await user.save();
                console.log(` ✅  Pro status and credits updated for user: ${user.email}`);
            }
        } catch (dbError) {
            console.error('Database error during user update:', dbError);
        }
    }
    res.json({received: true});
});

app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_sessions', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch((err) => console.error('MongoDB connection error:', err));

// --- Passport.js Google Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://lucius-ai.onrender.com/auth/google/callback" // Your LIVE backend URL
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
passport.serializeUser((user, done) => { done(null, user.id); });
passport.deserializeUser((id, done) => { User.findById(id, (err, user) => done(err, user)); });


// --- API ROUTES ---

// Google Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html', session: false }), (req, res) => {
    const payload = { user: { id: req.user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
    res.redirect(`https://www.ailucius.com/auth-success.html?token=${token}`); // Your LIVE frontend URL
});


// User Auth Routes
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


// AI Generation Routes
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { return res.status(404).json({ message: "User not found." }); }
        if (user.credits <= 0) { return res.status(402).json({ message: 'You have run out of credits.' });}

        const { prompt } = req.body; // Simplified for this example

        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            stream: true,
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        let fullResponse = "";
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }

        user.credits -= 1;
        await user.save();
        
        // Save conversation after streaming is complete
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
        res.end();

    } catch (error) {
        console.error("Streaming API error:", error);
        res.end();
    }
});

// All other routes for image generation, scheduler, etc. would follow this pattern.

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});