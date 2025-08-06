require('dotenv').config();

// --- Core Packages ---
const express = require('express');
const cors = require('cors'); // <-- As you correctly identified, we need this
const mongoose = require('mongoose');
const session = require('express-session');
// ... all other packages

// --- Local Modules ---
// ... all your local modules

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
// ... other initializations

// --- THIS IS THE CRITICAL FIX: The Final CORS Configuration ---
// This is the professional way to implement your solution.
const whitelist = [
    'https://www.ailucius.com', 
    'http://localhost:5173', 
    'http://localhost:5174',
];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== --1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};
app.use(cors(corsOptions));


// --- Core Middleware ---
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => { /* ... full webhook logic ... */ });
app.use(express.json());
app.use(session({ secret: 'a_very_secret_key_for_lucius', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

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