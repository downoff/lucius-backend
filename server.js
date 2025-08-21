// server.js
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
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const fetch = require('node-fetch'); // ✅ Shopify API calls

// --- Services ---
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { TwitterApi } = require('twitter-api-v2');
const sgMail = require('@sendgrid/mail');
const { nanoid } = require('nanoid');
const { YoutubeTranscript } = require('youtube-transcript');
const sharp = require('sharp');

// --- Local Modules ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');
const Canvas = require('./models/Canvas');
const Win = require('./models/Win');
const Share = require('./models/Share');
const Project = require('./models/Project');

// --- Init ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CORS ---
const whitelist = [
  'https://www.ailucius.com',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// --- Stripe Webhooks ---
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // TODO: implement signature verification
    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

// --- Sessions ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'a_very_secret_default_key_for_lucius_final',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    sameSite: 'lax',
    secure: !!process.env.COOKIE_SECURE,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

// --- Passport ---
app.use(passport.initialize());
app.use(passport.session());

// --- Database ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error(err));

// --- Health Check ---
app.get('/health', (req, res) => res.status(200).json({
  status: 'ok',
  message: 'Lucius AI backend is healthy.',
}));

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

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
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
}));

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

// --- Shopify Analyzer ---
app.post('/api/public/analyze-shopify-store', publicApiLimiter, async (req, res) => {
  try {
    const { storeUrl } = req.body;
    if (!storeUrl) return res.status(400).json({ message: 'Shopify store URL is required.' });

    const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
    const shopifyGraphQLEndpoint = `https://${storeUrl}/api/2023-10/graphql.json`;

    const query = `
      query {
        products(first: 5) {
          edges {
            node {
              title
              descriptionHtml
            }
          }
        }
      }
    `;

    const shopifyResponse = await fetch(shopifyGraphQLEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: query,
    });

    const shopifyData = await shopifyResponse.json();
    if (!shopifyData.data?.products?.edges) {
      return res.status(502).json({ message: 'Invalid response from Shopify Storefront API.' });
    }

    const products = shopifyData.data.products.edges.map(edge => edge.node);
    const productInfo = products
      .map(p => `Title: ${p.title}\nDescription: ${p.descriptionHtml.replace(/<[^>]*>?/gm, '').substring(0, 200)}`)
      .join('\n\n');

    const prompt = `
Act as a world-class e-commerce conversion strategist.
Here are some Shopify products: --- ${productInfo} ---
Generate a JSON object with key "assets" containing:
- rewritten_descriptions: 3 optimized descriptions
- ad_headlines: 3 ad headlines
- welcome_email: 1 short welcome email
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (error) {
    console.error("Shopify Analysis Error:", error);
    res.status(500).json({ message: "Failed to analyze store." });
  }
});

// --- GEO Analyzer ---
app.post('/api/ai/analyze-geo', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required.' });

    const prompt = `
Act as a world-class Generative Engine Optimization (GEO) strategist.
Analyze this content: "${text}".
Return JSON with:
- geo_score (1-100)
- strength_analysis
- improvement_suggestion
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (error) {
    console.error("GEO Analysis Error:", error);
    res.status(500).json({ message: "Failed to analyze content for GEO." });
  }
});

// --- Start ---
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});
