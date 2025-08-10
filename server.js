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

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CORS Configuration & Core Middleware ---
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
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_default_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Health Check Route ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Lucius AI backend is healthy.' });
});

// --- Passport.js Strategies ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://lucius-ai.onrender.com/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      }
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

// (Your full Passport.js config for Twitter should also be here)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

// --- AUTHENTICATION ROUTES ---
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

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user = new User({
            email,
            password,
            name: email.split('@')[0],
            emailVerificationToken: verificationToken
        });
        await user.save();

        const verificationUrl = `https://www.ailucius.com/verify-email?token=${verificationToken}`;
        const msg = {
            to: user.email,
            from: 'support@ailucius.com',
            subject: 'Welcome to Lucius AI! Please Verify Your Email',
            html: `Thank you for signing up! Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`,
        };
        await sgMail.send(msg);

        res.status(201).json({ message: 'Success! Please check your email to verify your account.' });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// (Your other auth routes like /login, /verify-email, etc. should be here)

// --- PUBLIC API ROUTES ---
// (All your public API routes for the demo, free tools, etc. should be here)

// --- PRIVATE (AUTHENTICATED) API ROUTES ---
// (All your private API routes for AI tools, user management, billing, etc. should be here)

// --- AUTOMATED ENGINES (CRON JOBS) ---
// (Your full cron job logic for credit refills and post scheduling should be here)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});