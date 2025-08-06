require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
// ... all other necessary packages

// --- App Initialization & Middleware ---
const app = express();
const port = process.env.PORT || 3000;
// ... (Your full CORS, JSON, Session, and Passport setup)

// --- Database Connection & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- API ROUTES ---
// ... (Your full API routes for public, private, auth, etc.)

// --- CRON JOBS ---
// ... (Your full cron job logic)

// --- THIS IS THE CRITICAL FIX: The Final Server Start Command ---
// This line must be at the very end of the file.
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});