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
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
const Project = require('./models/Project'); // <-- NEW

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- Final CORS Configuration ---
const whitelist = [
  'https://www.ailucius.com', 
  'http://localhost:5173', 
  'http://localhost:5174',
];
app.use(cors({
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// --- Middleware ---
app.use(express.json());
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => { /* webhook logic */ });
app.use(session({ 
  secret: process.env.SESSION_SECRET || 'a_very_secret_default_key_for_lucius_final', 
  resave: false, 
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// --- Health Check ---
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', message: 'Lucius AI backend is healthy.' }));

// --- Passport Strategies ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://lucius-ai.onrender.com/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName
        });
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// --- Public API ---
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You have reached the limit for our free tools.' }
});

app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are an expert social media marketer." }, { role: "user", content: prompt }],
    });

    res.json({ text: completion.choices[0].message.content });
  } catch (error) {
    console.error("Public Demo Error:", error);
    res.status(500).json({ message: 'An error occurred with the AI.' });
  }
});

// --- User Registration with Niche + Referral ---
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, referralCode, niche } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User with this email already exists.' });

    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user = new User({ 
      email, 
      password: hashedPassword, 
      name: email.split('@')[0],
      emailVerificationToken: verificationToken,
      referredBy: referredByUser ? referredByUser._id : null,
      niche: niche?.toLowerCase().trim() || 'general'
    });
    await user.save();

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// --- User Login ---
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// --- Get Current User ---
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Google OAuth with Niche Capture ---
app.get('/auth/google', (req, res, next) => {
  if (req.query.niche) {
    req.session.niche = String(req.query.niche).trim().toLowerCase();
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      if (req.session && req.session.niche) {
        user.niche = req.session.niche;
        await user.save();
        delete req.session.niche;
      }
      res.redirect('https://www.ailucius.com/dashboard');
    } catch (err) {
      console.error('OAuth callback error', err);
      res.redirect('/login');
    }
  }
);

// --- THE FINAL, "GOD-LIKE" ROUTE: THE AGI AGENT ---
app.post('/api/agi/execute-mission', authMiddleware, async (req, res) => {
  try {
    const { goal } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Step 1: Create a Project
    const project = new Project({ userId: user._id, goal });

    // Step 2: AI creates a strategic plan
    const planPrompt = `Based on the goal "${goal}", create a 3-step content plan. Output as a JSON object like {"plan": ["Step 1...", "Step 2...", "Step 3..."]}`;
    const planCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: planPrompt }],
    });

    let plan;
    try {
      plan = JSON.parse(planCompletion.choices[0].message.content).plan;
    } catch (e) {
      return res.status(500).json({ message: "AI did not return valid plan JSON." });
    }

    // Step 3: Execute each plan step
    let generatedContent = [];
    for (const step of plan) {
      const contentPrompt = `Using the brand voice "${user.brandVoicePrompt}", execute this step: "${step}"`;
      const contentCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: contentPrompt }],
      });
      generatedContent.push({ tool: "AGI Agent", output: { text: contentCompletion.choices[0].message.content } });
    }

    project.generatedContent = generatedContent;
    project.status = 'complete';
    await project.save();

    res.json(project);

  } catch (error) {
    console.error("AGI Mission Error:", error);
    res.status(500).json({ message: "The AGI mission failed." });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port} or on Render`);
});
