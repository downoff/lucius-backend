const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema({
    // Core User Info
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    name: { type: String },

    // Authentication & Integration IDs
    googleId: { type: String },
    stripeCustomerId: { type: String },
    twitterId: { type: String },
    twitterUsername: { type: String },
    twitterAccessToken: { type: String },
    twitterAccessSecret: { type: String },

    // Business Logic & Features
    isPro: { type: Boolean, default: false },
    credits: { type: Number, default: 10 },
    brandVoicePrompt: { type: String, default: 'You are an expert social media marketer.' },
    hasOnboarded: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerified: { type: Boolean, default: false },
    niche: { type: String, default: 'General' }, // <-- The new field
    
    // Viral Referral Engine
    referralCode: { type: String, unique: true, default: () => nanoid(8) },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
