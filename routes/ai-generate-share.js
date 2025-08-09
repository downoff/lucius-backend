// routes/ai-generate-share.js
const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { OpenAI } = require('openai'); // or require('openai') depending on your version
const Share = require('../models/Share');
const rateLimitShare = require('../middleware/rateLimitShare');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// Create an OpenAI client here (safe to create per-file, uses env var)
const OpenAIClient = require('openai');
const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });

// NOTE: router path includes the full /api/ai/generate to match usage in server.js wiring below.
router.post('/api/ai/generate', authMiddleware, rateLimitShare, async (req, res) => {
  try {
    const { prompt, tool = 'Social Studio', publicShare = false, title } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Credits check (your app uses credits field on user)
    if (!user.isPro && typeof user.credits === 'number' && user.credits <= 0) {
      return res.status(402).json({ message: 'You have run out of credits.' });
    }

    // === Call OpenAI (adapt model / params to your existing implementation)
    const systemPrompt = user.brandVoicePrompt || "You are an expert social media writer.";
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 900
    });

    const rawText = response.choices?.[0]?.message?.content || response.choices?.[0]?.text || '';

    // === sanitize the HTML (prevents XSS on public pages)
    const cleanText = sanitizeHtml(rawText, {
      allowedTags: ['p','br','strong','em','ul','ol','li','a','h2','h3'],
      allowedAttributes: { a: ['href','rel','target'] }
    });

    // === Save conversation (your model) and adjust credits
    const conv = new Conversation({
      user: user._id,
      prompt,
      response: cleanText,
      tool
    });

    if (!user.isPro) {
      user.credits = Math.max(0, (user.credits || 0) - 1);
    }

    // === Create share record only if user opted in
    let share = null;
    if (publicShare) {
      share = new Share({
        userId: user._id,
        tool,
        content: { text: cleanText, title: title || cleanText.slice(0,120) },
        public: true,
        watermark: user.isPro ? false : true
      });
      await share.save();
    }

    await Promise.all([conv.save(), user.save()]);

    return res.json({
      success: true,
      text: cleanText,
      shareId: share ? share.shareId : null,
      shareUrl: share ? `${process.env.BASE_URL.replace(/\/$/, '')}/s/${share.shareId}` : null
    });

  } catch (err) {
    console.error('generate route error', err);
    return res.status(500).json({ message: 'Generation failed' });
  }
});

module.exports = router;
