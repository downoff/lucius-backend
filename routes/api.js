const express = require('express');
const router = express.Router();
const Share = require('../models/Share');
const rateLimitShare = require('../middleware/rateLimitShare');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// ... (all your other private AI routes like carousel, hashtag, etc. will follow this pattern)

router.post('/ai/generate', authMiddleware, rateLimitShare, async (req, res) => {
  try {
    const { prompt, publicShare = false } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.isPro && user.credits < 1) return res.status(402).json({ message: 'You have run out of credits.' });
    
    // 1. Generate content with your existing logic
    const systemPrompt = user.brandVoicePrompt || "You are an expert social media marketer.";
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    });
    const text = completion.choices[0].message.content;

    // 2. Create the Conversation record (as before)
    if (!user.isPro) user.credits -= 1;
    const newConversation = new Conversation({ /* ... */ });
    
    // 3. Create the Share record ONLY if the user opted in
    let share = null;
    if (publicShare) {
      share = new Share({
        userId: user._id,
        tool: 'Social Studio',
        content: { 
            text: text, 
            title: prompt.substring(0, 50) + "..." 
        },
        public: true,
        watermark: user.isPro ? false : true // Watermark is forced for free users
      });
      await share.save();
    }
    
    await Promise.all([user.save(), newConversation.save()]);

    res.json({
      text: text,
      shareId: share ? share.shareId : null,
      shareUrl: share ? `${process.env.BASE_URL}/s/${share.shareId}` : null
    });

  } catch (err) {
    console.error("Generation/Share Error:", err);
    res.status(500).json({ message: 'Generation failed.' });
  }
});

module.exports = router;