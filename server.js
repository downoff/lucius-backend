require('dotenv').config();

// --- Core Packages ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // <-- NEW: For persistent sessions
const passport = require('passport');
// ... all other packages

// --- Local Modules ---
// ... all your local modules

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
// ... other initializations

// --- CORS Configuration & Core Middleware ---
// ... (Your full CORS and express.json setup)

// --- THIS IS THE CRITICAL FIX: Bulletproof Session Configuration ---
app.use(session({ 
    secret: 'a_very_secret_key_for_lucius', 
    resave: false, 
    saveUninitialized: false, // Recommended for production
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI 
    })
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Passport.js Strategies ---
// ... (Your full Passport.js config for Google and Twitter)

// --- API ROUTES ---
// ... (All your public and private API routes)

// --- AUTOMATED ENGINES (CRON JOBS) ---
// ... (Your full cron job logic)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});