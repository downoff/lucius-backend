require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// ... all other necessary packages and modules

// --- App Initialization & Middleware ---
const app = express();
const port = process.env.PORT || 3000;
// ... (Your full CORS, JSON, Session, and Passport setup)

// --- Database Connection & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));


// --- UPGRADED USER REGISTRATION ROUTE ---
app.post('/api/users/register', async (req, res) => {
    try {
        const { email, password, referralCode, niche } = req.body; // <-- New niche field
        let user = await User.findOne({ email });
        if (user) { return res.status(400).json({ message: 'User with this email already exists.' }); }

        let referredByUser = null;
        if (referralCode) {
            referredByUser = await User.findOne({ referralCode });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user = new User({ 
            email, 
            password, 
            name: email.split('@')[0],
            emailVerificationToken: verificationToken,
            referredBy: referredByUser ? referredByUser._id : null,
            niche: niche || 'General' // <-- Save the niche
        });
        await user.save();

        // ... (your existing referral reward and email verification logic)

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// ... (All your other public and private API routes)
// ... (Your cron jobs and server start logic)