require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cron = require('node-cron'); // <-- NEW: For scheduled tasks
const { TwitterApi } = require('twitter-api-v2'); // <-- NEW: For posting tweets
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost'); // <-- We will use this now
const Conversation = require('./models/Conversation');

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware, DB, and Passport Setup (No Changes) ---
// This is a summary. Ensure your full setup code is here.
// ... (Full setup code for Stripe Webhook, CORS, JSON, Session, Passport Strategies, etc.)

// --- API ROUTES ---
// ... (All existing API routes for Auth, AI tools, History, Billing, etc.)

// --- NEW: POST SCHEDULER ROUTES ---
// Route to let a user schedule a new post
app.post('/api/schedule-post', authMiddleware, async (req, res) => {
    try {
        const { content, scheduledAt, platform } = req.body;
        const user = await User.findById(req.user.id);
        if (!user.twitterId) {
            return res.status(400).json({ message: 'Please connect your X/Twitter account first.' });
        }
        const newPost = new ScheduledPost({
            userId: req.user.id,
            content,
            platform,
            scheduledAt: new Date(scheduledAt),
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error("Error scheduling post:", error);
        res.status(500).json({ message: 'Failed to schedule post.' });
    }
});

// Route to get all of a user's scheduled posts
app.get('/api/scheduled-posts', authMiddleware, async (req, res) => {
    try {
        const posts = await ScheduledPost.find({ userId: req.user.id }).sort({ scheduledAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch scheduled posts.' });
    }
});


// --- THE PERFECTION ENGINE: AUTOMATED PUBLISHING CRON JOB ---
// This will run every minute, 24/7
cron.schedule('* * * * *', async () => {
    console.log('Running cron job: Checking for scheduled posts to publish...');
    const now = new Date();
    
    // Find all posts that are due to be published and haven't been posted yet
    const postsToPublish = await ScheduledPost.find({
        scheduledAt: { $lte: now },
        status: 'scheduled'
    });

    if (postsToPublish.length === 0) {
        console.log('No posts to publish at this time.');
        return;
    }

    console.log(`Found ${postsToPublish.length} post(s) to publish.`);

    for (const post of postsToPublish) {
        try {
            const user = await User.findById(post.userId);
            if (!user || !user.twitterAccessToken || !user.twitterAccessSecret) {
                throw new Error(`User or Twitter credentials not found for post ${post._id}`);
            }

            // Initialize the Twitter client with the user's credentials
            const twitterClient = new TwitterApi({
                appKey: process.env.TWITTER_API_KEY,
                appSecret: process.env.TWITTER_API_SECRET_KEY,
                accessToken: user.twitterAccessToken,
                accessSecret: user.twitterAccessSecret,
            });

            // Post the tweet!
            await twitterClient.v2.tweet(post.content);

            // If successful, update the post's status in our database
            post.status = 'posted';
            post.postedAt = new Date();
            await post.save();
            console.log(`Successfully published post ${post._id} for user ${user.email}`);

        } catch (error) {
            console.error(`Failed to publish post ${post._id}:`, error);
            post.status = 'failed';
            await post.save();
        }
    }
});


// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});