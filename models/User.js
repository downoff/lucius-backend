const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid'); // We'll use a library for short, unique IDs

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    googleId: { type: String },
    name: { type: String },
    isPro: { type: Boolean, default: false },
    credits: { type: Number, default: 10 },
    stripeCustomerId: { type: String },
    brandVoicePrompt: { type: String, default: 'You are a helpful AI assistant.' },
    lastCreditRefill: { type: Date, default: Date.now },
    
    // NEW: Referral System Fields
    referralCode: { type: String, unique: true, default: () => nanoid(8) },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    twitterId: { type: String },
    twitterUsername: { type: String },
    twitterAccessToken: { type: String },
    twitterAccessSecret: { type: String },
}, { timestamps: true });

// ... rest of the file (password hashing middleware)