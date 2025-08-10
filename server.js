require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// ... all other necessary packages and modules

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
// ... other initializations

// --- THIS IS THE CRITICAL FIX: The Final "Truth Serum" CORS Configuration ---
const whitelist = [
    'https://www.ailucius.com', 
    'http://localhost:5173', 
    'http://localhost:5174',
];
const corsOptions = {
  origin: function (origin, callback) {
    // --- DIAGNOSTIC LOGGING ---
    console.log('CORS CHECK: Request from origin:', origin);
    
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      console.log('CORS CHECK: Origin approved.');
      callback(null, true)
    } else {
      console.log('CORS CHECK: Origin DENIED.');
      callback(new Error('Not allowed by CORS'))
    }
  }
};
app.use(cors(corsOptions));


// --- Core Middleware ---
app.use(express.json());
// ... (Your full Stripe Webhook, Session, Passport setup)

// --- Database Connection & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- PUBLIC API ROUTES ---
// ... (All your public API routes for the demo, free tools, etc.)

// --- PRIVATE (AUTHENTICATED) API ROUTES ---
// ... (All your private API routes)

// --- AUTOMATED ENGINES (CRON JOBS) ---
// ... (Your full cron job logic)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});