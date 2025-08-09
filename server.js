require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
// ... all other necessary packages and modules

// --- Local Modules ---
const User = require('./models/User');
// ... all other necessary models

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
// ... other initializations

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

// --- THIS IS THE CRITICAL FIX: The Final Session Configuration ---
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'a_very_secret_default_key', // Use an environment variable for your secret
    resave: false, 
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI 
    })
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Health Check Route ---
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Passport.js Strategies ---
// (Your full Passport.js config for Google and Twitter should be here)

// --- API ROUTES ---
// (All your public and private API routes)

// --- AUTOMATED ENGINES (CRON JOBS) ---
// (Your full cron job logic)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});