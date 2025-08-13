// server.js
require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');

// --- Service-Specific Packages ---
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy; // (not used yet; safe to keep)
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { TwitterApi } = require('twitter-api-v2'); // (not used yet; safe to keep)
const sgMail = require('@sendgrid/mail');
const { nanoid } = require('nanoid'); // (not used yet; safe to keep)
const { YoutubeTranscript } = require('youtube-transcript'); // (not used yet; safe to keep)
const sharp = require('sharp'); // (not used yet; safe to keep)

// --- Local Modules ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost'); // optional (stub or create later)
const Conversation = require('./models/Conversation');   // optional (stub or create later)
const Canvas = require('./models/Canvas');               // optional (stub or create later)
const Win = require('./models/Win');                     // optional (stub or create later)
const Share = require('./models/Share');                 // optional (stub or create later)
const Project = require('./models/Project');             // <-- USED

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// --- Final CORS Configuration ---
const whitelist = [
  'https://www.ailucius.com',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// --- Body Parsers (Stripe webhook must come BEFORE express.json) ---
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
app.use(express.json());

// --- Sessions ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_default_key_for_lucius_final',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      sameSite: 'lax',
      secure: !!process.env.COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// --- Passport ---
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error(err));

// --- Health Check ---
app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', message: 'Lucius AI backend is healthy.' })
);

// --- Passport Strategies ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// --- Rate Limiters ---
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You have reached the limit for our free tools.' },
});

// --- PUBLIC DEMO ---
app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert social media marketer.' },
        { role: 'user', content: prompt },
      ],
    });

    res.json({ text: completion.choices[0].message.content });
  } catch (error) {
    console.error('Public Demo Error:', error);
    res.status(500).json({ message: 'An error occurred with the AI.' });
  }
});

// --- 🔥 FINAL "SHOPIFY ENGINE" ---
app.post('/api/public/generate-shopify-description', publicApiLimiter, async (req, res) => {
  try {
    const { productName, features } = req.body;
    if (!productName || !features) {
      return res.status(400).json({ message: 'Product name and features are required.' });
    }

    const prompt = `
Act as a world-class e-commerce copywriter specializing in high-converting Shopify product descriptions.
My product is: "${productName}".
Its key features are: "${features}".
Generate a complete, SEO-optimized product description.
The output must be a valid JSON object with a single key, "description".
The value of "description" should be an object with three keys:
- "title": A catchy, SEO-friendly product title.
- "body_html": A compelling, persuasive product description formatted in clean HTML (using <p>, <ul>, <li>, and <strong> tags).
- "social_post": A short, engaging tweet to announce this product.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(completion.choices[0].message.content || '{}');
    if (!data.description) {
      return res.status(502).json({ message: 'AI did not return expected description JSON.' });
    }
    res.json(data);
  } catch (error) {
    console.error('Shopify Engine Error:', error);
    res.status(500).json({ message: 'Failed to generate description.' });
  }
});

// --- USERS: Register (email/pass) with niche + referral ---
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, referralCode, niche } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User with this email already exists.' });

    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const hashed = await bcrypt.hash(password, 12);

    user = new User({
      email,
      password: hashed,
      name: email.split('@')[0],
      emailVerificationToken: verificationToken,
      referredBy: referredByUser ? referredByUser._id : null,
      niche: niche?.toLowerCase().trim() || 'general',
      referralCode: nanoid(10),
    });
    await user.save();

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// --- CURRENT USER ---
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Google OAuth with niche capture ---
app.get('/auth/google', (req, res, next) => {
  if (req.query.niche) {
    req.session.niche = String(req.query.niche).trim().toLowerCase();
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      if (req.session && req.session.niche) {
        user.niche = req.session.niche;
        await user.save();
        delete req.session.niche;
      }
      res.redirect(process.env.POST_AUTH_REDIRECT || 'https://www.ailucius.com/dashboard');
    } catch (err) {
      console.error('OAuth callback error', err);
      res.redirect('/login');
    }
  }
);

// --- THE FINAL, "GOD-LIKE" AGI AGENT ---
app.post('/api/agi/execute-mission', authMiddleware, async (req, res) => {
  try {
    const { goal } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!goal) return res.status(400).json({ message: 'Goal is required.' });

    const project = new Project({ userId: user._id, goal, status: 'running' });
    await project.save();

    const planPrompt = `Based on the goal "${goal}", create a 3-step content plan. Output as a JSON object like {"plan": ["Step 1...", "Step 2...", "Step 3..."]}`;
    const planCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: planPrompt }],
      response_format: { type: 'json_object' },
    });

    let plan;
    try {
      const raw = JSON.parse(planCompletion.choices[0].message.content || '{}');
      plan = Array.isArray(raw.plan) ? raw.plan : null;
    } catch {
      plan = null;
    }
    if (!plan) return res.status(500).json({ message: 'AI did not return valid plan JSON.' });

    const generatedContent = [];
    for (const step of plan) {
      const contentPrompt = `Using the brand voice "${user.brandVoicePrompt || 'clear, persuasive, credible'}", execute this step: "${step}"`;
      const contentCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: contentPrompt }],
      });
      generatedContent.push({ tool: 'AGI Agent', output: { text: contentCompletion.choices[0].message.content } });
    }

    project.generatedContent = generatedContent;
    project.status = 'complete';
    await project.save();

    res.json(project);
  } catch (error) {
    console.error('AGI Mission Error:', error);
    res.status(500).json({ message: 'The AGI mission failed.' });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
