const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid'); // Used for generating unique referral codes

const userSchema = new mongoose.Schema({
    // Core User Info
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false }, // Not required for OAuth users
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
    brandVoicePrompt: { type: String, default: 'You are a helpful AI assistant.' },
    lastCreditRefill: { type: Date, default: Date.now },
    hasOnboarded: { type: Boolean, default: false },

    // Email Verification
    emailVerificationToken: String,
    emailVerified: { type: Boolean, default: false },

    // Viral Referral Engine
    referralCode: { type: String, unique: true, default: () => nanoid(8) },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

// This middleware automatically hashes the user's password before saving it
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new) and is not empty
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;