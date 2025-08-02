const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    googleId: { type: String },
    name: { type: String },
    isPro: { type: Boolean, default: false },
    credits: { type: Number, default: 10 },
    stripeCustomerId: { type: String },
    brandVoicePrompt: { type: String, default: 'You are a helpful AI assistant.' },
    lastCreditRefill: { type: Date, default: Date.now }, // <-- NEW FIELD
    twitterId: { type: String },
    twitterUsername: { type: String },
    twitterAccessToken: { type: String },
    twitterAccessSecret: { type: String },
}, { timestamps: true });

// ... rest of the file (password hashing middleware)