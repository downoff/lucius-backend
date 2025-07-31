require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy; // <-- NEW
// ... all other package requires

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
// ... other model requires

const app = express();
// ... other initializations

// --- Middleware, DB, and Passport Setup ---
// ... (Full setup code for cors, json, session, etc.)

// --- Passport.js Strategies ---
// ... (Your existing GoogleStrategy config)

// NEW: Twitter Strategy for Authentication
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET_KEY,
    callbackURL: "https://lucius-ai.onrender.com/auth/twitter/callback", // Your LIVE backend callback URL
    passReqToCallback: true // Allows us to access the request object in the callback
  },
  async (req, token, tokenSecret, profile, done) => {
    try {
        // We find the logged-in user via the JWT in the session
        const user = await User.findById(req.user.id);
        if (user) {
            // If the user is found, we save their Twitter credentials to their profile
            user.twitterId = profile.id;
            user.twitterUsername = profile.username;
            user.twitterAccessToken = token;
            user.twitterAccessSecret = tokenSecret;
            await user.save();
            return done(null, user);
        }
        return done(null, false, { message: 'User not found.' });
    } catch (error) {
        return done(error, null);
    }
  }
));

// --- API ROUTES ---
// ... (All existing API routes)

// --- NEW: Twitter Authentication Routes ---
// This is a special auth route that requires a JWT to be passed in the state
const twitterAuth = (req, res, next) => {
    const token = req.query.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user; // Attach user to the request for Passport
            passport.authenticate('twitter')(req, res, next);
        } catch (e) {
            res.status(401).send('Invalid token');
        }
    } else {
        res.status(400).send('No token provided');
    }
};

app.get('/auth/twitter', twitterAuth);

app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    failureRedirect: '/dashboard?twitter_auth=failed',
    session: false // We are using JWTs, not sessions
}), (req, res) => {
    // Successful authentication, redirect to the dashboard.
    res.redirect('https://www.ailucius.com/dashboard?twitter_auth=success');
});


// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
