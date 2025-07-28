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

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');

const app = express();
const port = 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
app.use(cors({ origin: ["https://www.ailucius.com", "http://127.0.0.1:5500", "http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_lucius', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Passport.js Config
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

// AI Generation Route
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { return res.status(404).json({ message: "User not found." }); }
        if (user.credits <= 0) { return res.status(402).json({ message: 'You have run out of credits.' }); }

        const { prompt } = req.body;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
        });
        const text = completion.choices[0].message.content;
        
        user.credits -= 1;
        await user.save();
        
        res.json({ text, remainingCredits: user.credits });
    } catch (error) {
        console.error("AI Generation error:", error);
        res.status(500).json({ message: 'An error occurred with the AI.' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});