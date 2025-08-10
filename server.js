require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const User = require('./models/User');
const authMiddleware = require('./middleware/auth');

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CORS Configuration & Core Middleware ---
const whitelist = ['https://www.ailucius.com', 'http://localhost:5173'];
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

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Health Check Route ---
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- USER AUTHENTICATION ROUTES ---

// Final, Perfected User Registration Route
app.post('/api/users/register', async (req, res) => {
    try {
        const { email, password, referralCode, niche } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        let newUser = new User({
            email,
            password,
            name: email.split('@')[0],
            emailVerificationToken: verificationToken,
            niche: niche || 'General'
        });

        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                newUser.referredBy = referrer._id;
            }
        }

        await newUser.save();

        if (newUser.referredBy) {
            await User.findByIdAndUpdate(newUser.referredBy, { $inc: { credits: 50 } });
        }

        const verificationUrl = `https://www.ailucius.com/verify-email?token=${verificationToken}`;
        const msg = {
            to: newUser.email,
            from: 'support@ailucius.com', // MUST be a verified sender in SendGrid
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

// ... (All your other public and private API routes for login, Google Auth, AI tools, etc.)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});