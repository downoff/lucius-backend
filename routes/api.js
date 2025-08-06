const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// All private, authenticated routes are now here
router.post('/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        if (!user.isPro && user.credits < 1) return res.status(402).json({ message: 'You have run out of credits.' });

        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

        const systemPrompt = user.brandVoicePrompt || "You are an expert social media marketer.";

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        });
        
        const text = completion.choices[0].message.content;
        
        if (!user.isPro) user.credits -= 1;
        
        const newConversation = new Conversation({
            userId: user._id,
            title: prompt.substring(0, 40) + "...",
            messages: [{ role: 'user', content: prompt }, { role: 'model', content: text }]
        });
        
        await Promise.all([user.save(), newConversation.save()]);
        res.json({ text, remainingCredits: user.credits });
    } catch (error) {
        console.error("CRITICAL AI Generation error:", error);
        res.status(500).json({ message: 'A critical error occurred with the AI.' });
    }
});

// ... (All your other private routes like /generate-carousel, /history, etc., go here)

module.exports = router;