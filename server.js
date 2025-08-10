require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// ... all your other packages and module imports

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
// ... all other initializations

// --- CORS Configuration & Core Middleware ---
// ... (Your full CORS and middleware setup)
app.use(express.json());


// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- THIS IS THE CRITICAL FIX: The Health Check Route ---
// This must be one of the first routes defined.
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Lucius AI backend is healthy.' });
});

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