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
    
    // NEW: Twitter Integration Fields
    twitterId: { type: String },
    twitterUsername: { type: String },
    twitterAccessToken: { type: String },
    twitterAccessSecret: { type: String },

    xAuth: { // This is likely deprecated now, we'll keep it for now but the above is the new standard
        token: String,
        tokenSecret: String,
        isVerified: { type: Boolean, default: false }
    }
}, { timestamps: true });

// ... rest of the file (password hashing middleware)
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
