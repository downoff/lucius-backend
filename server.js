require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const sanitizeHtml = require('sanitize-html');

// --- Service-Specific Packages ---
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { TwitterApi } = require('twitter-api-v2');
const sgMail = require('@sendgrid/mail');
const { nanoid } = require('nanoid');
const { YoutubeTranscript } = require('youtube-transcript');
const sharp = require('sharp');

// --- Local Modules ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const ScheduledPost = require('./models/ScheduledPost');
const Conversation = require('./models/Conversation');
const Canvas = require('./models/Canvas');
const Win = require('./models/Win');
const Share = require('./models/Share');

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CORS Configuration & Core Middleware ---
const whitelist = ['https://www.ailucius.com', 'http://localhost:5173', 'http://localhost:5174'];
const corsOptions = { /* ... your full CORS config ... */ };
app.use(cors(corsOptions));
app.use(express.json());
app.use(session({ /* ... your full session config ... */ }));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- Health Check Route ---
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Passport.js Strategies ---
// (Your full Passport.js config for Google and Twitter should be here)

// --- Middleware ---
const publicApiLimiter = rateLimit({ /* ... */ });
const rateLimitShare = async (req, res, next) => { /* ... your full rate limit logic ... */ };

// --- PUBLIC API ROUTES ---
// (All your public routes for the demo, free tools, etc., should be here)

// --- PRIVATE (AUTHENTICATED) API ROUTES ---

// THIS IS THE FINAL, PERFECTED STREAMING ROUTE
app.post('/api/ai/generate', authMiddleware, rateLimitShare, async (req, res) => {
  try {
    const { prompt, tool = 'Social Studio', publicShare = false, title } = req.body;
    const user = await User.findById(req.user.id); // Use req.user.id from JWT
    if (!user) {
        // We can't send a status here because headers might be sent, so we end the stream
        return res.end(); 
    }

    if (!user.isPro && user.credits <= 0) {
        res.write(`data: ${JSON.stringify({ error: 'You have run out of credits.' })}\n\n`);
        return res.end();
    }

    // STREAM START
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponseText = '';
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: user.brandVoicePrompt || "You are an expert social media writer." },
        { role: 'user', content: prompt }
      ],
      stream: true,
    });

    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content || '';
      if (token) {
        fullResponseText += token;
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }
    }

    // Sanitize the final full text after the stream is complete
    const cleanText = sanitizeHtml(fullResponseText);

    // Save everything to the database after the stream has finished
    const conv = new Conversation({ userId: user._id, title: prompt.slice(0, 50), messages: [{role: 'user', content: prompt}, {role: 'model', content: cleanText}] });
    if (!user.isPro) user.credits -= 1;

    let share = null;
    if (publicShare) {
      share = new Share({
        userId: user._id,
        tool,
        content: { text: cleanText, title: title || cleanText.slice(0, 120) },
        public: true,
        watermark: !user.isPro
      });
      await share.save();
    }

    await Promise.all([conv.save(), user.save()]);

    // Send a final message to the client with the share URL and signal to close
    res.write(`data: ${JSON.stringify({
      done: true,
      shareId: share ? share.shareId : null,
      shareUrl: share ? `${process.env.BASE_URL}/s/${share.shareId}` : null
    })}\n\n`);
    res.end();

  } catch (err) {
    console.error('generate route error', err);
    // THIS IS THE CRITICAL FIX: If an error occurs, send it through the stream
    // instead of trying to send a separate JSON response.
    res.write(`data: ${JSON.stringify({ error: 'Generation failed. Please try again.' })}\n\n`);
    res.end();
  }
});


// ... (All your other private routes)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});